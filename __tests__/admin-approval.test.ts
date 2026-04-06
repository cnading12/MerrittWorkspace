import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// In-memory fake supabase that records the inserted member row.
const state: { application: any; insertedMember: any | null; isAdmin: boolean } = {
  application: {
    id: 'app-1',
    email: 'newbie@example.com',
    first_name: 'New',
    last_name: 'Bie',
    phone: '555',
    company_name: 'Acme',
  },
  insertedMember: null,
  isAdmin: true,
};

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }),
      admin: {
        inviteUserByEmail: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: 'invited-1' } }, error: null }),
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
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
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
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
