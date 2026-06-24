import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Env required by the token signer + removal helpers.
// ---------------------------------------------------------------------------
beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  process.env.PORTAL_CANCEL_TOKEN_SECRET = '';
  process.env.RESEND_API_KEY = '';
  delete process.env.STRIPE_SECRET_KEY;
});

// ---------------------------------------------------------------------------
// 1) Cancel token (pure crypto, no mocks)
// ---------------------------------------------------------------------------
import {
  signCancelToken,
  verifyCancelToken,
  buildCancelOnboardingUrl,
} from '@/lib/portal/cancelToken';

describe('cancelToken', () => {
  it('round-trips a valid token for the same member id', () => {
    const token = signCancelToken('member-123');
    expect(verifyCancelToken('member-123', token)).toBe(true);
  });

  it('rejects a token issued for a different member id', () => {
    const token = signCancelToken('member-123');
    expect(verifyCancelToken('member-999', token)).toBe(false);
  });

  it('rejects a tampered / empty token', () => {
    expect(verifyCancelToken('member-123', 'not-a-real-token')).toBe(false);
    expect(verifyCancelToken('member-123', '')).toBe(false);
    expect(verifyCancelToken('', signCancelToken('member-123'))).toBe(false);
  });

  it('builds a confirmation-page URL (not a mutating endpoint) carrying member + token', () => {
    const url = buildCancelOnboardingUrl({
      baseUrl: 'https://example.com',
      memberId: 'member-123',
    });
    expect(url).toContain('https://example.com/portal/cancel-onboarding?');
    const qs = new URL(url).searchParams;
    expect(qs.get('member')).toBe('member-123');
    expect(verifyCancelToken('member-123', qs.get('token') || '')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2) Removal core — purpose-built in-memory Supabase mock
// ---------------------------------------------------------------------------
function makeStore() {
  return {
    members: [
      {
        id: 'm-1',
        user_id: 'u-1',
        first_name: 'Trial',
        last_name: 'User',
        email: 'trial@example.com',
        company_name: null,
        designation: 'flex',
        desk_number: null,
        office_number: null,
        application_id: 'app-1',
        stripe_subscription_id: null,
      },
    ] as any[],
    payment_history: [] as any[],
    member_applications: [
      { id: 'app-1', member_id: 'm-1', wants_trial_day: true, trial_date: '2026-06-01', payload: {} },
    ] as any[],
    member_documents: [
      { member_id: 'm-1', file_path: 'm-1/photo_id.png' },
      { member_id: 'm-1', file_path: 'm-1/proof.png' },
    ] as any[],
    removedStoragePaths: [] as string[],
    deletedUsers: [] as string[],
  };
}

// A tiny filter-aware query builder supporting only the chains the removal
// helpers actually use: select().eq().in().gt().limit()/maybeSingle(), and
// delete().eq().
function makeSupabase(store: ReturnType<typeof makeStore>) {
  function tableRows(table: string): any[] {
    return (store as any)[table] || [];
  }
  function selectBuilder(table: string) {
    const filters: Array<(r: any) => boolean> = [];
    const apply = () => tableRows(table).filter((r) => filters.every((f) => f(r)));
    const builder: any = {
      eq(col: string, val: any) {
        filters.push((r) => r[col] === val);
        return builder;
      },
      in(col: string, vals: any[]) {
        filters.push((r) => vals.includes(r[col]));
        return builder;
      },
      gt(col: string, val: number) {
        filters.push((r) => r[col] > val);
        return builder;
      },
      limit() {
        return Promise.resolve({ data: apply(), error: null });
      },
      maybeSingle() {
        return Promise.resolve({ data: apply()[0] ?? null, error: null });
      },
      single() {
        const rows = apply();
        return Promise.resolve(
          rows.length
            ? { data: rows[0], error: null }
            : { data: null, error: { message: 'not found' } }
        );
      },
      then(resolve: any) {
        // awaiting the builder directly (no terminal) returns all matches
        return Promise.resolve({ data: apply(), error: null }).then(resolve);
      },
    };
    return builder;
  }
  function deleteBuilder(table: string) {
    return {
      eq(col: string, val: any) {
        const rows = tableRows(table);
        const kept = rows.filter((r) => r[col] !== val);
        (store as any)[table] = kept;
        return Promise.resolve({ data: null, error: null });
      },
    };
  }
  return {
    from(table: string) {
      return {
        select: () => selectBuilder(table),
        delete: () => deleteBuilder(table),
      };
    },
    storage: {
      from() {
        return {
          remove(paths: string[]) {
            store.removedStoragePaths.push(...paths);
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
    },
    auth: {
      admin: {
        deleteUser(userId: string) {
          store.deletedUsers.push(userId);
          return Promise.resolve({ data: null, error: null });
        },
      },
    },
  } as any;
}

import {
  memberHasEverPaid,
  removeUnpaidMember,
} from '@/lib/portal/memberRemoval';

describe('memberHasEverPaid', () => {
  it('is false when there are no payment rows', async () => {
    const store = makeStore();
    const sb = makeSupabase(store);
    expect(await memberHasEverPaid(sb, 'm-1')).toBe(false);
  });

  it('is false when only failed/pending charges exist', async () => {
    const store = makeStore();
    store.payment_history.push(
      { member_id: 'm-1', status: 'failed', amount_cents: 50000 },
      { member_id: 'm-1', status: 'pending', amount_cents: 50000 }
    );
    const sb = makeSupabase(store);
    expect(await memberHasEverPaid(sb, 'm-1')).toBe(false);
  });

  it('is true when a succeeded charge exists', async () => {
    const store = makeStore();
    store.payment_history.push({ member_id: 'm-1', status: 'succeeded', amount_cents: 50000 });
    const sb = makeSupabase(store);
    expect(await memberHasEverPaid(sb, 'm-1')).toBe(true);
  });

  it('treats a refunded charge as having paid (kept)', async () => {
    const store = makeStore();
    store.payment_history.push({ member_id: 'm-1', status: 'refunded', amount_cents: 50000 });
    const sb = makeSupabase(store);
    expect(await memberHasEverPaid(sb, 'm-1')).toBe(true);
  });

  it('ignores a $0 row (e.g. final-month credit)', async () => {
    const store = makeStore();
    store.payment_history.push({ member_id: 'm-1', status: 'succeeded', amount_cents: 0 });
    const sb = makeSupabase(store);
    expect(await memberHasEverPaid(sb, 'm-1')).toBe(false);
  });
});

describe('removeUnpaidMember', () => {
  it('hard-deletes the member, their docs, application, payments, and login', async () => {
    const store = makeStore();
    store.payment_history.push({ member_id: 'm-1', status: 'failed', amount_cents: 50000 });
    const sb = makeSupabase(store);

    await removeUnpaidMember({
      sb,
      member: store.members[0],
      cancelledBy: 'admin',
    });

    expect(store.members).toHaveLength(0);
    expect(store.member_applications).toHaveLength(0);
    expect(store.payment_history).toHaveLength(0);
    expect(store.deletedUsers).toEqual(['u-1']);
    expect(store.removedStoragePaths).toEqual(['m-1/photo_id.png', 'm-1/proof.png']);
  });
});
