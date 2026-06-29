import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// In-memory state for the mock supabase client.
// ---------------------------------------------------------------------------
const state = {
  member: {
    id: 'm-1',
    status: 'cancelled' as string,
    archived_at: null as string | null,
    archived_by: null as string | null,
  },
  lastUpdate: null as any,
  isAdmin: true,
};

function resetState() {
  state.member = {
    id: 'm-1',
    status: 'cancelled',
    archived_at: null,
    archived_by: null,
  };
  state.lastUpdate = null;
  state.isAdmin = true;
}

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'u-1' } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === 'admin_users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: state.isAdmin ? { user_id: 'u-1' } : null,
                }),
            }),
          }),
        };
      }
      if (table === 'members') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { ...state.member }, error: null }),
            }),
          }),
          update: (fields: any) => {
            state.lastUpdate = fields;
            Object.assign(state.member, fields);
            return { eq: () => Promise.resolve({ data: null, error: null }) };
          },
        };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
    },
  }),
}));

import { POST as archive, DELETE as restore } from '@/app/api/admin/members/[id]/archive/route';

const params = { params: Promise.resolve({ id: 'm-1' }) };

function authReq(method = 'POST') {
  return new NextRequest('http://localhost/api/admin/members/m-1/archive', {
    method,
    headers: { authorization: 'Bearer test-token' },
  });
}
function unauthReq(method = 'POST') {
  return new NextRequest('http://localhost/api/admin/members/m-1/archive', { method });
}

beforeEach(() => resetState());

describe('isMissingArchivedColumnError', () => {
  it('detects the Postgres undefined-column error (42703)', async () => {
    const { isMissingArchivedColumnError } = await import('@/lib/portal/archive');
    expect(isMissingArchivedColumnError({ code: '42703' })).toBe(true);
    expect(
      isMissingArchivedColumnError({
        message: 'column members.archived_at does not exist',
      })
    ).toBe(true);
  });

  it('ignores unrelated errors and null', async () => {
    const { isMissingArchivedColumnError } = await import('@/lib/portal/archive');
    expect(isMissingArchivedColumnError(null)).toBe(false);
    expect(isMissingArchivedColumnError({ code: '23505', message: 'duplicate key' })).toBe(false);
  });
});

describe('member archive (POST)', () => {
  it('archives a cancelled member, stamping archived_at + archived_by and freeing the seat', async () => {
    const res = await archive(authReq(), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.archived_at).toBeTruthy();
    expect(state.lastUpdate.archived_at).toBeTruthy();
    expect(state.lastUpdate.archived_by).toBe('u-1');
    // Desk/office are cleared so the seat reopens for the next member.
    expect(state.lastUpdate.desk_number).toBeNull();
    expect(state.lastUpdate.office_number).toBeNull();
  });

  it('refuses to archive a non-cancelled member', async () => {
    state.member.status = 'active';
    const res = await archive(authReq(), params);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/cancelled/i);
    expect(state.lastUpdate).toBeNull();
  });

  it('is idempotent when already archived', async () => {
    state.member.archived_at = '2026-06-01T00:00:00.000Z';
    const res = await archive(authReq(), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // No re-write on the idempotent path.
    expect(state.lastUpdate).toBeNull();
  });

  it('rejects non-admins', async () => {
    state.isAdmin = false;
    const res = await archive(authReq(), params);
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await archive(unauthReq(), params);
    expect(res.status).toBe(401);
  });
});

describe('member archive (DELETE / restore)', () => {
  it('clears archived_at + archived_by', async () => {
    state.member.archived_at = '2026-06-01T00:00:00.000Z';
    state.member.archived_by = 'u-1';
    const res = await restore(authReq('DELETE'), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(state.lastUpdate).toEqual({ archived_at: null, archived_by: null });
  });

  it('rejects non-admins', async () => {
    state.isAdmin = false;
    const res = await restore(authReq('DELETE'), params);
    expect(res.status).toBe(403);
  });
});
