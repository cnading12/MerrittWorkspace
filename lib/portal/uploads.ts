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

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

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
    throw new UploadValidationError('File too large (max 10MB)');
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
