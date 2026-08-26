import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the service-role supabase client used inside lib/portal/auth.ts.
const getUser = vi.fn();
const fromMock = vi.fn();

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    auth: { getUser },
    from: fromMock,
  }),
}));

import { requireMember, requireAdmin, PortalError } from '@/lib/portal/auth';

function makeReq(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/test', { headers });
}

beforeEach(() => {
  getUser.mockReset();
  fromMock.mockReset();
});

describe('requireMember', () => {
  it('throws 401 when no Authorization header is present', async () => {
    await expect(requireMember(makeReq())).rejects.toMatchObject({
      status: 401,
    });
  });

  it('throws 401 when token is invalid', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    await expect(
      requireMember(makeReq({ authorization: 'Bearer nope' }))
    ).rejects.toMatchObject({ status: 401 });
  });

  it('returns the member row when token resolves to a known member', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { id: 'm1', user_id: 'u1' }, error: null }),
        }),
      }),
    });
    const member = await requireMember(makeReq({ authorization: 'Bearer ok' }));
    expect(member.id).toBe('m1');
  });
});

describe('getUserFromRequest transport failures', () => {
  // Bouncing to the sign-in page is the right response to a rejected token and
  // exactly the wrong one to an unreachable auth server, so the two must not
  // both come back as 401.
  it('throws 503 when Supabase Auth cannot be reached', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthRetryableFetchError', message: 'fetch failed' },
    });
    await expect(
      requireAdmin(makeReq({ authorization: 'Bearer ok' }))
    ).rejects.toMatchObject({ status: 503 });
  });
});

describe('requireAdmin', () => {
  it('throws 401 with no token', async () => {
    await expect(requireAdmin(makeReq())).rejects.toMatchObject({ status: 401 });
  });

  it('throws 403 when authenticated user is not in admin_users', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });
    await expect(
      requireAdmin(makeReq({ authorization: 'Bearer ok' }))
    ).rejects.toMatchObject({ status: 403 });
  });

  // The 403 has to name the account. "Forbidden" alone cannot tell someone
  // holding the right password that they are signed in as the wrong user.
  it('names the signed-in account in the 403', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'cole@example.com' } },
      error: null,
    });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });
    await expect(
      requireAdmin(makeReq({ authorization: 'Bearer ok' }))
    ).rejects.toThrow(/cole@example\.com/);
  });

  // A lookup that failed is not an authorization that was refused: a paused
  // Supabase project must not report itself as "you are not an admin".
  it('throws 503, not 403, when the admin_users lookup itself fails', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: null,
              error: { message: 'could not connect to server' },
            }),
        }),
      }),
    });
    await expect(
      requireAdmin(makeReq({ authorization: 'Bearer ok' }))
    ).rejects.toMatchObject({ status: 503 });
  });

  it('returns the user when they are an admin', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { user_id: 'u1' }, error: null }),
        }),
      }),
    });
    const user = await requireAdmin(makeReq({ authorization: 'Bearer ok' }));
    expect(user.id).toBe('u1');
  });
});

describe('PortalError', () => {
  it('carries an http status', () => {
    const e = new PortalError('nope', 418);
    expect(e.status).toBe(418);
    expect(e.message).toBe('nope');
  });
});
