// "Error: Load failed" — what a member saw when they tried to file their
// required documents.
//
// It is not our message. A request body over the platform's 4.5MB limit is
// dropped before the route runs, so there is no response to read and no JSON
// error to show; `fetch` itself rejects with a TypeError whose text is
// whatever the browser calls a dead connection. Every upload form rendered
// `e.message` verbatim, so the member was handed three words naming neither
// the cause nor anything they could do.
//
// The file is the overwhelmingly likely culprit and its size is right there.

import { describe, it, expect } from 'vitest';
import { describeUploadFailure } from '@/lib/portal/idUpload';
import { MAX_UPLOAD_BYTES } from '@/lib/portal/uploads';

function file(bytes: number): File {
  return { size: bytes, type: 'image/jpeg', name: 'licence.jpg' } as unknown as File;
}

const OVERSIZED = file(MAX_UPLOAD_BYTES + 1);

describe('a dead fetch is explained, not echoed', () => {
  // The three browsers word the same failure three ways, and all three used
  // to reach the member unaltered.
  it.each([
    ['Safari', 'Load failed'],
    ['Chrome', 'Failed to fetch'],
    ['Firefox', 'NetworkError when attempting to fetch resource.'],
  ])('rewrites %s\'s wording when the file is oversized', (_browser, message) => {
    const out = describeUploadFailure(new TypeError(message), OVERSIZED);
    expect(out).not.toBe(message);
    expect(out).toMatch(/4MB/);
    // The number they can act on.
    expect(out).toMatch(/4\.0MB/);
    expect(out).toMatch(/smaller/i);
  });

  it('still explains itself when there is no file to blame', () => {
    const out = describeUploadFailure(new TypeError('Load failed'), null);
    expect(out).not.toBe('Load failed');
    expect(out).toMatch(/too large|connection/i);
  });

  it('does not blame the size when the file is within the limit', () => {
    const out = describeUploadFailure(new TypeError('Load failed'), file(1024));
    expect(out).toMatch(/connection/i);
    expect(out).not.toMatch(/0\.0MB/);
  });
});

describe('a real error response is passed straight through', () => {
  // The server's own messages are better than anything this could invent —
  // rewriting them would hide "Unsupported file type" behind a guess about
  // the network.
  it('keeps a message the route actually returned', () => {
    const msg = 'Unsupported file type. Please upload a JPG, PNG, WEBP, HEIC or PDF.';
    expect(describeUploadFailure(new Error(msg), OVERSIZED)).toBe(msg);
  });

  it('does not treat every TypeError as a network failure', () => {
    // A genuine bug in the handler must not be reported as a big file.
    const msg = "Cannot read properties of undefined (reading 'documents')";
    expect(describeUploadFailure(new TypeError(msg), OVERSIZED)).toBe(msg);
  });

  it('falls back to something sayable for an empty error', () => {
    expect(describeUploadFailure(new Error(''), null)).toMatch(/failed/i);
    expect(describeUploadFailure(undefined, null)).toMatch(/failed/i);
  });
});
