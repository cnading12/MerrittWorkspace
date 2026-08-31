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

import { MAX_ID_FILE_BYTES, MAX_ID_FILE_LABEL } from '@/lib/portal/trialApplication';

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

// ---------------------------------------------------------------------------
// What to tell someone whose upload never reached the server.
//
// When a request body exceeds the platform's limit, the platform closes the
// connection before our route runs. There is no response to read and no JSON
// error to show — `fetch` itself rejects with a TypeError whose message is
// whatever the browser calls a dead connection: "Load failed" in Safari,
// "Failed to fetch" in Chrome, "NetworkError when attempting to fetch
// resource." in Firefox.
//
// Every upload form here caught that and rendered `e.message` verbatim, so
// the member trying to file their required documents was told "Error: Load
// failed" — three words that name neither the cause nor anything they could
// do about it. The file is the overwhelmingly likely culprit and its size is
// right there, so say so.
// ---------------------------------------------------------------------------

/** Is this a fetch that never completed, as opposed to an error response? */
function isNetworkFailure(e: unknown): boolean {
  if (!(e instanceof TypeError)) return false;
  return /load failed|failed to fetch|networkerror|network request failed/i.test(
    e.message || ''
  );
}

/**
 * A message worth showing for a failed upload.
 *
 * `file` is optional but worth passing: when the connection died and the file
 * is large, its size is almost certainly the reason, and naming the number
 * turns an unexplained failure into an instruction.
 */
export function describeUploadFailure(e: unknown, file?: File | null): string {
  if (!isNetworkFailure(e)) {
    const message = e instanceof Error ? e.message : String(e ?? '');
    return message || 'The upload failed. Please try again.';
  }
  if (file && file.size > MAX_ID_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return (
      `That file is ${mb}MB, which is over the ${MAX_ID_FILE_LABEL} limit, so it never ` +
      'reached us. Please upload a smaller photo or scan — on a phone, choosing a ' +
      'smaller size when you take or share the picture is usually enough.'
    );
  }
  return (
    'The upload did not reach us — this is usually a file that is too large, or a ' +
    'dropped connection. Please check your connection and try again with a smaller file.'
  );
}
