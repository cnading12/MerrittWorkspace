// Browser-side preparation of a photo ID before it is uploaded.
//
// Why this exists: a photo of a driver's licence taken on a current phone is
// routinely 5–12MB, and none of that size is doing any work — the file is
// only ever opened by a member of staff checking a name and a face. Sending
// the original meant the same picture got rejected twice over: once by our
// own size check, and once by the 4.5MB request-body limit the serverless
// platform enforces *before* the request reaches the route, which the form
// can only report as an unexplained failure.
//
// So the image is re-encoded here first: longest edge capped, JPEG quality
// stepped down until it fits. A 12MB portrait lands a few hundred KB later
// and still resolves the print on a licence.
//
// Two things deliberately pass through untouched:
//   • PDFs — nothing in the browser can re-encode one, and a scanned ID PDF
//     is small anyway.
//   • Anything that will not decode — HEIC in a browser with no native
//     support, a truncated file — comes back exactly as it arrived, so the
//     caller's size check explains the problem in words instead of this
//     failing silently on the way past.

import { MAX_ID_FILE_BYTES } from '@/lib/portal/trialApplication';

// Successive (longest edge, JPEG quality) attempts, coarsest last. The first
// pass is generous on purpose: a legible ID is the point, and 2000px at 0.85
// already brings any phone photo comfortably under the limit. The later
// steps only exist for the rare enormous scan.
const ATTEMPTS: ReadonlyArray<{ maxEdge: number; quality: number }> = [
  { maxEdge: 2000, quality: 0.85 },
  { maxEdge: 2000, quality: 0.7 },
  { maxEdge: 1600, quality: 0.6 },
  { maxEdge: 1200, quality: 0.5 },
];

/**
 * Shrink an image file until it fits within `targetBytes`, if it can.
 *
 * Returns the original file when it is already small enough, when it is not
 * an image, or when the browser cannot decode or re-encode it. The caller
 * still has to check the size of what comes back — this reduces files, it
 * does not promise to.
 */
export async function prepareIdUpload(
  file: File,
  targetBytes: number = MAX_ID_FILE_BYTES
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= targetBytes) return file;

  let source: CanvasImageSource & { width: number; height: number };
  try {
    source = await decode(file);
  } catch {
    return file;
  }

  try {
    for (const { maxEdge, quality } of ATTEMPTS) {
      const blob = await encode(source, maxEdge, quality);
      if (blob && blob.size <= targetBytes) {
        return new File([blob], jpegName(file.name), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      }
    }
    return file;
  } finally {
    if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close();
  }
}

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    return await createImageBitmap(file);
  }
  // Safari versions without createImageBitmap for File inputs.
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not decode image'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encode(
  source: CanvasImageSource & { width: number; height: number },
  maxEdge: number,
  quality: number
): Promise<Blob | null> {
  const longest = Math.max(source.width, source.height);
  // Never scale up: a small-but-heavy image (a PNG screenshot of an ID, say)
  // is fixed by the re-encode alone.
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  // JPEG has no alpha; without this a transparent PNG comes out black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

// The stored object is named from the mime type on the server, so this only
// has to stop the person seeing "licence.heic" next to a file that is now a
// JPEG.
function jpegName(name: string): string {
  const base = String(name || 'photo-id').replace(/\.[^.]*$/, '').trim();
  return `${base || 'photo-id'}.jpg`;
}
