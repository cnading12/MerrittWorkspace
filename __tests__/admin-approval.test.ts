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
  // The decline path writes `payload` and `status` separately, so failures
  // are injected per write.
  statusWriteError: { message: string; code?: string } | null;
  payloadWriteError: { message: string; code?: string } | null;
  // The nastiest failure mode: every write reports success and none of it
  // persists (a trigger reverting the change, the wrong project answering).
  // The route's read-back verification exists for exactly this.
  writesDoNotStick: boolean;
  // Every row the approve flow tried to upsert into `members`, in order —
  // the archived-column fallback makes two attempts.
  memberUpserts: any[];
  // Simulates a database without 20260625_member_archive.sql, which rejects
  // any write naming `archived_at`.
  membersMissingArchivedColumn: boolean;
  // Approve's auth-user handling. When createUser refuses ("already been
  // registered"), the route has to FIND that existing user — across pages,
  // not just the first one listUsers returns by default.
  createUserError: { message: string } | null;
  authUserPages: Array<Array<{ id: string; email: string }>>;
  listUsersCalls: any[];
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
  statusWriteError: null,
  payloadWriteError: null,
  writesDoNotStick: false,
  memberUpserts: [],
  membersMissingArchivedColumn: false,
  createUserError: null,
  authUserPages: [],
  listUsersCalls: [],
};

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }),
      admin: {
        createUser: vi.fn().mockImplementation(() =>
          Promise.resolve(
            state.createUserError
              ? { data: { user: null }, error: state.createUserError }
              : { data: { user: { id: 'invited-1' } }, error: null }
          )
        ),
        listUsers: vi.fn().mockImplementation((opts?: { page?: number; perPage?: number }) => {
          state.listUsersCalls.push(opts);
          const page = opts?.page ?? 1;
          return Promise.resolve({
            data: { users: state.authUserPages[page - 1] || [] },
            error: null,
          });
        }),
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
                if (!state.writesDoNotStick) Object.assign(state.application, patch);
              };
              // Which of the two decline writes is this?
              const isPayloadWrite = Object.keys(patch).length === 1 && 'payload' in patch;
              const perWriteError = isPayloadWrite
                ? state.payloadWriteError
                : state.statusWriteError;
              return {
                select: () => ({
                  maybeSingle: async () => {
                    const err = state.updateError || perWriteError;
                    if (err) return { data: null, error: err };
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
          upsert: (row: any) => ({
            select: () => ({
              single: () => {
                state.memberUpserts.push(row);
                if (state.membersMissingArchivedColumn && 'archived_at' in row) {
                  return Promise.resolve({
                    data: null,
                    error: {
                      code: '42703',
                      message: 'column "archived_at" of relation "members" does not exist',
                    },
                  });
                }
                state.insertedMember = { id: 'm-1', ...row };
                return Promise.resolve({ data: state.insertedMember, error: null });
              },
            }),
          }),
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
import { isHandled } from '@/lib/portal/applicationQueue';

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
  state.statusWriteError = null;
  state.payloadWriteError = null;
  state.writesDoNotStick = false;
  state.memberUpserts = [];
  state.membersMissingArchivedColumn = false;
  state.createUserError = null;
  state.authUserPages = [];
  state.listUsersCalls = [];
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
    const body = await res.json();
    expect(body.application_marked).toBe(true);
    expect(state.insertedMember).toBeTruthy();
    expect(state.insertedMember.email).toBe('newbie@example.com');
    expect(state.insertedMember.application_id).toBe('app-1');
    expect(state.insertedMember.status).toBe('approved');
    expect(state.insertedMember.user_id).toBe('invited-1');
    expect(state.application.status).toBe('approved');
  });

  // The upsert keys on email, so approving someone whose old member row was
  // archived UPDATES that row. Archived rows are hidden from the member list
  // and the totals — without clearing the marker, the approval "works"
  // (member created, invitation emailed) while the member is nowhere on the
  // Members page.
  it('approve clears the archived marker so a returning member is visible', async () => {
    const res = await approveRoute(makeReq({ action: 'approve' }), {
      params: Promise.resolve({ id: 'app-1' }),
    });
    expect(res.status).toBe(200);
    expect(state.insertedMember.archived_at).toBeNull();
    expect(state.insertedMember.archived_by).toBeNull();
  });

  it('approve still works on a database without the archive migration', async () => {
    state.membersMissingArchivedColumn = true;
    const res = await approveRoute(makeReq({ action: 'approve' }), {
      params: Promise.resolve({ id: 'app-1' }),
    });
    expect(res.status).toBe(200);
    // First attempt named archived_at and was refused; the retry dropped it.
    expect(state.memberUpserts).toHaveLength(2);
    expect('archived_at' in state.memberUpserts[1]).toBe(false);
    expect(state.insertedMember.email).toBe('newbie@example.com');
  });

  // If the application row cannot be marked approved, its card stays in the
  // queue looking exactly like an Approve button that did nothing — while
  // the member exists and has been emailed. The response has to say so, or
  // the admin's next move is approving the same person a second time.
  it('approve reports when the application row could not be marked approved', async () => {
    state.statusWriteError = { message: 'permission denied for table member_applications' };
    const res = await approveRoute(makeReq({ action: 'approve' }), {
      params: Promise.resolve({ id: 'app-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.application_marked).toBe(false);
    expect(body.warning).toContain('stay in the queue');
    expect(state.insertedMember).toBeTruthy();
  });

  it('rejects an unknown action', async () => {
    const res = await approveRoute(makeReq({ action: 'whatever' }), {
      params: Promise.resolve({ id: 'app-1' }),
    });
    expect(res.status).toBe(400);
  });

  // Approving someone who already has an auth account (a returning member, a
  // trial visitor who signed in before, a second approval after a partial
  // failure) goes through listUsers to find their id. listUsers returns ONE
  // page — 50 users by default — and the lookup used to stop there, so on a
  // project with more members than that the approval quietly filed the member
  // row without its user_id.
  it('finds an existing auth user beyond the first listUsers page, case-insensitively', async () => {
    state.createUserError = { message: 'A user with this email address has already been registered' };
    const filler = Array.from({ length: 1000 }, (_, i) => ({
      id: `filler-${i}`,
      email: `filler-${i}@example.com`,
    }));
    state.authUserPages = [filler, [{ id: 'existing-7', email: 'Newbie@Example.com' }]];
    const res = await approveRoute(makeReq({ action: 'approve' }), {
      params: Promise.resolve({ id: 'app-1' }),
    });
    expect(res.status).toBe(200);
    expect(state.listUsersCalls.length).toBeGreaterThanOrEqual(2);
    expect(state.insertedMember.user_id).toBe('existing-7');
  });

  // When no auth user can be found at all, the member row must OMIT user_id
  // rather than write null: the upsert keys on email and may be UPDATING the
  // row of a returning member whose user_id link is how they sign in to the
  // portal. Writing null over it approves them on the admin screen while
  // breaking their own login.
  it('never overwrites an existing user_id link with null', async () => {
    state.createUserError = { message: 'A user with this email address has already been registered' };
    state.authUserPages = [[{ id: 'someone-else', email: 'other@example.com' }]];
    const res = await approveRoute(makeReq({ action: 'approve' }), {
      params: Promise.resolve({ id: 'app-1' }),
    });
    expect(res.status).toBe(200);
    for (const row of state.memberUpserts) {
      expect('user_id' in row).toBe(false);
    }
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
    expect(body).toMatchObject({
      ok: true,
      id: 'app-1',
      status: 'declined',
      status_written: true,
      payload_written: true,
      // The row read back fresh after both writes — the same question the
      // queue will ask on the page's next load.
      verified: { status: 'declined', dismissed_marker: true, hidden_from_queue: true },
    });
    expect(state.application.status).toBe('declined');
  });

  // Writes that report success and persist nothing must come back as an
  // error, not a green "Dismissed" banner over an unchanged queue — which is
  // the exact symptom staff kept reporting.
  it('reports a dismissal whose writes claimed success but did not stick', async () => {
    state.writesDoNotStick = true;
    const { status, body } = await post({ action: 'decline' });
    expect(status).toBe(500);
    expect(body.error).toContain('did not stick');
    expect(body.ok).toBeUndefined();
  });

  // The whole point of the second write: `status` on this table has a
  // history of refusing changes, and a dismissal must not be lost with it.
  it('still dismisses when the status column refuses the write', async () => {
    state.statusWriteError = { message: 'new row violates check constraint' };
    const { status, body } = await post({ action: 'decline' });
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, status_written: false, payload_written: true });
    expect(state.application.payload.dismissed_at).toEqual(expect.any(String));
    expect(isHandled(state.application)).toBe(true);
  });

  it('still dismisses when the payload write fails', async () => {
    state.payloadWriteError = { message: 'jsonb too large' };
    const { status, body } = await post({ action: 'decline' });
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, status_written: true, payload_written: false });
    expect(isHandled(state.application)).toBe(true);
  });

  it('records the payload marker the queue reads', async () => {
    await post({ action: 'decline' });
    expect(state.application.payload).toMatchObject({ dismissed_by: 'admin-1' });
    expect(isHandled(state.application)).toBe(true);
  });

  it('dismisses a trial day application — there is nothing to approve, but it can be cleared', async () => {
    state.application.application_kind = 'trial';
    state.application.payload = { application_kind: 'trial', wants_trial_day: true };
    const { status } = await post({ action: 'decline' });
    expect(status).toBe(200);
    expect(state.application.status).toBe('declined');
  });

  it('reports a failed write instead of claiming success — only when BOTH fail', async () => {
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
    expect(body.error).toContain('matched no row');
  });

  it('restores a dismissed application and clears both markers', async () => {
    await post({ action: 'decline' });
    expect(isHandled(state.application)).toBe(true);

    const { status, body } = await post({ action: 'restore' });
    expect(status).toBe(200);
    expect(body.status).toBe('pending');
    expect(state.application).toMatchObject({
      status: 'pending',
      decision_note: null,
      decided_by: null,
      decided_at: null,
    });
    expect(state.application.payload.dismissed_at).toBeUndefined();
    expect(isHandled(state.application)).toBe(false);
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
