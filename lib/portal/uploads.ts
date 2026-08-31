// Shared validation for the member/guest document uploads.
//
// Both upload paths (portal documents, guest booking photo ID) previously
// accepted any file and passed the browser-supplied `file.type` straight
// through to Supabase Storage as the object's stored content type. Two
// problems with that:
//
//   • The content type is attacker-chosen. Uploading an .html (or an SVG with
//     an inline <script>) declared as text/html means that when staff later
//     open the file through a signed URL, it renders as a live page instead
//     of downloading — script execution on the storage origin, with the
//     viewer's storage session.
//   • Nothing bounded the extension, so the stored object name could carry
//     path-ish or double-extension junk.
//
// These documents are only ever photos of an ID or a scanned PDF, so a strict
// allowlist costs nothing and removes the whole class of problem.

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
] as const;

// Canonical extension per accepted type — we name the stored object from this
// rather than from the client's filename.
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};

// The largest file any of these routes will take.
//
// This is a REQUEST-BODY limit, not a storage limit. Every upload path here
// posts multipart to a serverless function, and the platform rejects a body
// over 4.5MB *before* our route runs — so a ceiling above that can never be
// enforced by `validateUpload`, because the request the ceiling is meant to
// catch never arrives. What the person sees instead is the raw fetch
// rejection: "Load failed" in Safari, "Failed to fetch" in Chrome.
//
// That is exactly how it failed. The trial form worked this out and set its
// own 4MB constant; the portal document upload and the guest booking kept a
// 10MB one, so a phone photo of a licence — routinely 5-12MB — died on the
// platform's limit with no message anyone could act on. One definition now,
// so the two cannot drift apart again.
//
// 4MB leaves room for the rest of the multipart body, and costs uploaders
// nothing: lib/portal/idUpload.ts re-encodes an oversized photo in the
// browser first, so only a large scanned PDF — which nothing can shrink
// client-side — ever reaches this check.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** The same number in the words the forms and the API both use. */
export const MAX_UPLOAD_LABEL = '4MB';

export interface ValidatedUpload {
  contentType: string;
  extension: string;
}

export class UploadValidationError extends Error {}

/**
 * Validate an uploaded file's size and declared type.
 *
 * Returns the content type to store and the canonical extension to name the
 * object with. Throws UploadValidationError with a user-safe message.
 */
export function validateUpload(file: File): ValidatedUpload {
  if (!file || file.size === 0) {
    throw new UploadValidationError('File is empty');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      `That file is ${(file.size / (1024 * 1024)).toFixed(1)}MB, and the maximum is ` +
        `${MAX_UPLOAD_LABEL}. Please upload a smaller photo or scan.`
    );
  }

  // `file.type` can be an empty string when the browser can't guess; treat
  // that as unacceptable rather than defaulting to something permissive.
  const declared = (file.type || '').toLowerCase().split(';')[0].trim();
  if (!(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(declared)) {
    throw new UploadValidationError(
      'Unsupported file type. Please upload a JPG, PNG, WEBP, HEIC or PDF.'
    );
  }

  return { contentType: declared, extension: EXTENSION_BY_MIME[declared] };
}
