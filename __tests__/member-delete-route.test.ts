import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// In-memory state for the mock supabase client.
const state = {
  member: {
    id: 'm-1',
    user_id: 'u-1',
    first_name: 'Trial',
    last_name: 'User',
    email: 'trial@example.com',
    company_name: null as string | null,
    designation: null as string | null,
    desk_number: null as string | null,
    office_number: null as string | null,
    application_id: null as string | null,
    stripe_subscription_id: null as string | null,
    status: 'cancelled',
  } as any,
  payments: [] as any[],
  members: [] as any[],
  deletedUsers: [] as string[],
  isAdmin: true,
};

function resetState() {
  state.member = {
    id: 'm-1',
    user_id: 'u-1',
    first_name: 'Trial',
    last_name: 'User',
    email: 'trial@example.com',
    company_name: null,
    designation: null,
    desk_number: null,
    office_number: null,
    application_id: null,
    stripe_subscription_id: null,
    status: 'cancelled',
  };
  state.payments = [];
  state.members = [state.member];
  state.deletedUsers = [];
  state.isAdmin = true;
}

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null }),
      admin: {
        deleteUser: (id: string) => {
          state.deletedUsers.push(id);
          return Promise.resolve({ data: null, error: null });
        },
      },
    },
    storage: {
      from: () => ({ remove: () => Promise.resolve({ data: null, error: null }) }),
    },
    from: (table: string) => {
      if (table === 'admin_users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: state.isAdmin ? { user_id: 'u-1' } : null }),
            }),
          }),
        };
      }
      if (table === 'payment_history') {
        return {
          select: () => {
            const b: any = {
              eq: () => b,
              in: () => b,
              gt: () => b,
              limit: () => Promise.resolve({ data: state.payments, error: null }),
            };
            return b;
          },
          delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        };
      }
      if (table === 'members') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { ...state.member }, error: null }),
            }),
          }),
          delete: () => ({
            eq: () => {
              state.members = [];
              return Promise.resolve({ data: null, error: null });
            },
          }),
        };
      }
      if (table === 'member_documents') {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        };
      }
      if (table === 'member_applications') {
        return { delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
    },
  }),
}));

import { DELETE as deleteMember } from '@/app/api/admin/members/[id]/delete/route';

const params = { params: Promise.resolve({ id: 'm-1' }) };
function authReq() {
  return new NextRequest('http://localhost/api/admin/members/m-1/delete', {
    method: 'DELETE',
    headers: { authorization: 'Bearer test-token' },
  });
}
function unauthReq() {
  return new NextRequest('http://localhost/api/admin/members/m-1/delete', { method: 'DELETE' });
}

beforeEach(() => {
  resetState();
  delete process.env.STRIPE_SECRET_KEY;
  process.env.RESEND_API_KEY = '';
});

describe('admin member delete route', () => {
  it('hard-deletes a never-paid member', async () => {
    const res = await deleteMember(authReq(), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
    expect(state.members).toHaveLength(0);
    expect(state.deletedUsers).toEqual(['u-1']);
  });

  it('refuses to delete a member who has paid (archive instead)', async () => {
    state.payments = [{ member_id: 'm-1', status: 'succeeded', amount_cents: 50000 }];
    const res = await deleteMember(authReq(), params);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.paid).toBe(true);
    expect(json.error).toMatch(/archive/i);
    // Nothing deleted.
    expect(state.members).toHaveLength(1);
    expect(state.deletedUsers).toEqual([]);
  });

  it('rejects non-admins', async () => {
    state.isAdmin = false;
    const res = await deleteMember(authReq(), params);
    expect(res.status).toBe(403);
    expect(state.members).toHaveLength(1);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await deleteMember(unauthReq(), params);
    expect(res.status).toBe(401);
  });
});
