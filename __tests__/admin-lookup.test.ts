import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// The tracer answers "what happened to THIS person" — so the fake holds
// rows for several emails and the tests check that each row's report names
// the screen it is on, or the reason it is hidden.
const state: {
  applications: any[];
  members: any[];
  isAdmin: boolean;
} = {
  applications: [],
  members: [],
  isAdmin: true,
};

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }),
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
      const rows = table === 'member_applications' ? state.applications : state.members;
      const matching = (email: string) =>
        rows.filter((r) => String(r.email).toLowerCase() === email.toLowerCase());
      if (table === 'member_applications') {
        return {
          select: () => ({
            ilike: (_col: string, email: string) => ({
              order: () => Promise.resolve({ data: matching(email), error: null }),
            }),
          }),
        };
      }
      if (table === 'members') {
        return {
          select: () => ({
            ilike: (_col: string, email: string) =>
              Promise.resolve({ data: matching(email), error: null }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { GET as lookup } from '@/app/api/admin/lookup/route';

async function trace(email: string) {
  const res = await lookup(
    new NextRequest(`http://localhost/api/admin/lookup?email=${encodeURIComponent(email)}`, {
      headers: { authorization: 'Bearer admin-token' },
    })
  );
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  state.applications = [];
  state.members = [];
  state.isAdmin = true;
});

describe('the email tracer', () => {
  it('refuses non-admin callers', async () => {
    state.isAdmin = false;
    const { status } = await trace('a@b.c');
    expect(status).toBe(403);
  });

  it('requires an email', async () => {
    const res = await lookup(
      new NextRequest('http://localhost/api/admin/lookup', {
        headers: { authorization: 'Bearer admin-token' },
      })
    );
    expect(res.status).toBe(400);
  });

  it('says plainly when the database holds nothing for the email', async () => {
    const { status, body } = await trace('ghost@example.com');
    expect(status).toBe(200);
    expect(body.applications).toHaveLength(0);
    expect(body.members).toHaveLength(0);
    expect(body.summary).toContain('never reached this database');
  });

  // The exact confusion that motivated this: four near-identical test
  // submissions, one dismissed — the report separates them by timestamp and
  // says which are still live cards, so a surviving twin cannot read as a
  // dismissal that failed.
  it('tells identical-looking submissions apart and says which still show', async () => {
    state.applications = [
      {
        id: 'a1',
        email: 'test@example.com',
        status: 'pending',
        created_at: '2026-08-31T18:53:46Z',
        application_kind: 'trial',
        payload: { application_kind: 'trial' },
      },
      {
        id: 'a2',
        email: 'test@example.com',
        status: 'pending',
        created_at: '2026-08-31T19:10:00Z',
        application_kind: 'trial',
        payload: { application_kind: 'trial', dismissed_at: '2026-08-31T22:00:00Z' },
      },
    ];
    const { body } = await trace('test@example.com');
    const byId = Object.fromEntries(body.applications.map((a: any) => [a.id, a]));
    expect(byId.a1.where).toContain('SHOWING');
    expect(byId.a1.where).toContain('Trial days');
    expect(byId.a2.dismissed_marker).toBe(true);
    expect(byId.a2.where).toContain('dismissed');
  });

  it('says an archived member is in the archived view, not gone', async () => {
    state.members = [
      {
        id: 'm1',
        email: 'test@example.com',
        status: 'approved',
        archived_at: '2026-08-31T20:00:00Z',
        created_at: '2026-08-31T18:00:00Z',
      },
    ];
    const { body } = await trace('TEST@example.com');
    expect(body.members).toHaveLength(1);
    expect(body.members[0].archived).toBe(true);
    expect(body.members[0].where).toContain('View archived');
  });

  it('points at the Members page for a live member row', async () => {
    state.members = [
      {
        id: 'm2',
        email: 'test@example.com',
        status: 'approved',
        archived_at: null,
        created_at: '2026-08-31T18:00:00Z',
      },
    ];
    const { body } = await trace('test@example.com');
    expect(body.members[0].archived).toBe(false);
    expect(body.members[0].where).toContain('Members page');
  });
});
