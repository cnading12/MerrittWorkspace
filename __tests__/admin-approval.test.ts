import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// In-memory fake supabase that records the inserted member row.
const state: {
  application: any;
  insertedMember: any | null;
  isAdmin: boolean;
  updates: any[];
  // Injected failures for the decline/restore path. A write that fails, and
  // a write that matches no row, are the two ways "Dismiss" used to look
  // like it had worked when it had not.
  updateError: { message: string; code?: string } | null;
  updateMatchesNothing: boolean;
} = {
  application: {
    id: 'app-1',
    email: 'newbie@example.com',
    first_name: 'New',
    last_name: 'Bie',
    phone: '555',
    company_name: 'Acme',
    status: 'pending',
  },
  insertedMember: null,
  isAdmin: true,
  updates: [],
  updateError: null,
  updateMatchesNothing: false,
};

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }),
      admin: {
        createUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: 'invited-1' } }, error: null }),
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
        generateLink: vi.fn().mockResolvedValue({
          data: { properties: { hashed_token: 'tok-abc' } },
          error: null,
        }),
      },
    },
    from: (table: string) => {
      if (table === 'admin_users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: state.isAdmin ? { user_id: 'admin-1' } : null }),
            }),
          }),
        };
      }
      if (table === 'member_applications') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: state.application, error: null }),
            }),
          }),
          // `.eq()` is both awaitable (the approve flow's fire-and-note
          // update) and chainable into `.select().maybeSingle()` (the
          // decline/restore flow, which verifies its own write).
          update: (patch: any) => ({
            eq: (_col: string, id: string) => {
              const apply = () => {
                state.updates.push(patch);
                Object.assign(state.application, patch);
              };
              return {
                select: () => ({
                  maybeSingle: async () => {
                    if (state.updateError) return { data: null, error: state.updateError };
                    if (state.updateMatchesNothing) return { data: null, error: null };
                    apply();
                    return { data: { id, status: patch.status }, error: null };
                  },
                }),
                then: (onOk: any, onErr: any) => {
                  if (state.updateError) {
                    return Promise.resolve({ data: null, error: state.updateError }).then(onOk, onErr);
                  }
                  apply();
                  return Promise.resolve({ data: null, error: null }).then(onOk, onErr);
                },
              };
            },
          }),
        };
      }
      if (table === 'members') {
        return {
          upsert: (row: any) => {
            state.insertedMember = { id: 'm-1', ...row };
            return {
              select: () => ({
                single: () => Promise.resolve({ data: state.insertedMember, error: null }),
              }),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

// Avoid sending real emails.
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({}) };
  },
}));

import { POST as approveRoute } from '@/app/api/admin/applications/[id]/route';

function makeReq(body: any) {
  return new NextRequest('http://localhost/api/admin/applications/app-1', {
    method: 'POST',
    headers: { authorization: 'Bearer admin-token', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  state.insertedMember = null;
  state.isAdmin = true;
  state.updates = [];
  state.updateError = null;
  state.updateMatchesNothing = false;
  state.application = {
    id: 'app-1',
    email: 'newbie@example.com',
    first_name: 'New',
    last_name: 'Bie',
    phone: '555',
    company_name: 'Acme',
    status: 'pending',
  };
  delete process.env.RESEND_API_KEY;
});

describe('admin application approval', () => {
  it('returns 403 for non-admin callers', async () => {
    state.isAdmin = false;
    const res = await approveRoute(makeReq({ action: 'approve' }), {
      params: Promise.resolve({ id: 'app-1' }),
    });
    expect(res.status).toBe(403);
  });

  it('approve creates a member row linked to the application', async () => {
    const res = await approveRoute(makeReq({ action: 'approve' }), {
      params: Promise.resolve({ id: 'app-1' }),
    });
    expect(res.status).toBe(200);
    expect(state.insertedMember).toBeTruthy();
    expect(state.insertedMember.email).toBe('newbie@example.com');
    expect(state.insertedMember.application_id).toBe('app-1');
    expect(state.insertedMember.status).toBe('approved');
    expect(state.insertedMember.user_id).toBe('invited-1');
  });

  it('rejects an unknown action', async () => {
    const res = await approveRoute(makeReq({ action: 'whatever' }), {
      params: Promise.resolve({ id: 'app-1' }),
    });
    expect(res.status).toBe(400);
  });
});

// Dismiss / decline, and its undo.
//
// This path had no test at all, and it discarded the result of its own
// update while answering `{ ok: true }` unconditionally. The admin panel
// took that at its word and dropped the card, so a dismiss that never
// reached the database was indistinguishable from one that did — until the
// row reappeared on the next load.
describe('dismissing an application', () => {
  async function post(body: any, id = 'app-1') {
    const res = await approveRoute(makeReq(body), { params: Promise.resolve({ id }) });
    return { status: res.status, body: await res.json() };
  }

  it('marks the row declined and says what it wrote', async () => {
    const { status, body } = await post({ action: 'decline' });
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, id: 'app-1', status: 'declined' });
    expect(state.application.status).toBe('declined');
    expect(state.updates[0]).toMatchObject({ status: 'declined', decided_by: 'admin-1' });
  });

  it('dismisses a trial day application — there is nothing to approve, but it can be cleared', async () => {
    state.application.application_kind = 'trial';
    state.application.payload = { application_kind: 'trial', wants_trial_day: true };
    const { status } = await post({ action: 'decline' });
    expect(status).toBe(200);
    expect(state.application.status).toBe('declined');
  });

  it('reports a failed write instead of claiming success', async () => {
    state.updateError = { message: 'permission denied for table member_applications' };
    const { status, body } = await post({ action: 'decline' });
    expect(status).toBe(500);
    expect(body.error).toContain('permission denied');
    expect(body.ok).toBeUndefined();
    expect(state.application.status).toBe('pending');
  });

  it('reports an update that matched no row', async () => {
    state.updateMatchesNothing = true;
    const { status, body } = await post({ action: 'decline' });
    expect(status).toBe(409);
    expect(body.error).toContain('not updated');
  });

  it('restores a dismissed application and clears the decision', async () => {
    await post({ action: 'decline' });
    expect(state.application.status).toBe('declined');

    const { status, body } = await post({ action: 'restore' });
    expect(status).toBe(200);
    expect(body.status).toBe('pending');
    expect(state.application).toMatchObject({
      status: 'pending',
      decision_note: null,
      decided_by: null,
      decided_at: null,
    });
  });

  it('reports a failed restore too', async () => {
    state.updateError = { message: 'connection failure' };
    const { status } = await post({ action: 'restore' });
    expect(status).toBe(500);
  });

  it('rejects an unknown action', async () => {
    const { status } = await post({ action: 'obliterate' });
    expect(status).toBe(400);
  });
});
