import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// In-memory fake supabase. The self-test route inserts a synthetic row,
// reads it back three ways, and deletes it; the fake holds a real rows
// array so every step operates on actual state rather than canned answers.
const state: {
  rows: any[];
  isAdmin: boolean;
  // Inject a hard (non-missing-column) insert failure.
  insertError: { message: string; code?: string } | null;
  // Simulate a database without 20260824: inserts naming application_kind
  // are refused with the PostgREST missing-column code.
  missingApplicationKind: boolean;
  // What the database's status column default assigns a fresh row.
  statusDefault: string | null;
  deleteFails: boolean;
} = {
  rows: [],
  isAdmin: true,
  insertError: null,
  missingApplicationKind: false,
  statusDefault: 'pending',
  deleteFails: false,
};

let nextId = 1;

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
      if (table !== 'member_applications') throw new Error(`unexpected table ${table}`);
      const sortedDesc = () =>
        [...state.rows].sort((a, b) =>
          String(b.created_at).localeCompare(String(a.created_at))
        );
      return {
        insert: (row: any) => ({
          select: () => ({
            single: () => {
              if (state.insertError) {
                return Promise.resolve({ data: null, error: state.insertError });
              }
              if (state.missingApplicationKind && 'application_kind' in row) {
                return Promise.resolve({
                  data: null,
                  error: {
                    code: 'PGRST204',
                    message: "Could not find the 'application_kind' column of 'member_applications' in the schema cache",
                  },
                });
              }
              const stored = {
                id: `row-${nextId++}`,
                created_at: new Date(Date.now() + nextId).toISOString(),
                status: state.statusDefault,
                ...row,
              };
              state.rows.push(stored);
              return Promise.resolve({ data: { id: stored.id }, error: null });
            },
          }),
        }),
        select: () => ({
          order: () => ({
            limit: (n: number) => {
              const list = sortedDesc().slice(0, n);
              return {
                maybeSingle: () => Promise.resolve({ data: list[0] ?? null, error: null }),
                then: (onOk: any, onErr: any) =>
                  Promise.resolve({ data: list, error: null }).then(onOk, onErr),
              };
            },
          }),
          eq: (col: string, v: any) => ({
            maybeSingle: () =>
              Promise.resolve({
                data: state.rows.find((r) => r[col] === v) ?? null,
                error: null,
              }),
          }),
        }),
        update: (patch: any) => ({
          eq: (col: string, v: any) => {
            const row = state.rows.find((r) => r[col] === v);
            if (row) Object.assign(row, patch);
            return Promise.resolve({ data: null, error: null });
          },
        }),
        delete: () => ({
          eq: (col: string, v: any) => {
            if (!state.deleteFails) {
              state.rows = state.rows.filter((r) => r[col] !== v);
              return Promise.resolve({ error: null });
            }
            return Promise.resolve({ error: { message: 'delete is not permitted' } });
          },
        }),
      };
    },
  }),
}));

import { POST as selfTest } from '@/app/api/admin/applications/self-test/route';

function makeReq() {
  return new NextRequest('http://localhost/api/admin/applications/self-test', {
    method: 'POST',
    headers: { authorization: 'Bearer admin-token' },
  });
}

async function run() {
  const res = await selfTest(makeReq());
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  state.rows = [];
  state.isAdmin = true;
  state.insertError = null;
  state.missingApplicationKind = false;
  state.statusDefault = 'pending';
  state.deleteFails = false;
  nextId = 1;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://testproject.supabase.co';
});

describe('the pipeline self-test', () => {
  it('refuses non-admin callers', async () => {
    state.isAdmin = false;
    const { status } = await run();
    expect(status).toBe(403);
  });

  it('passes end to end on a healthy database, and cleans up after itself', async () => {
    const { status, body } = await run();
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.verdict).toContain('PIPELINE WORKS');
    expect(body.steps.every((s: any) => s.ok)).toBe(true);
    // Which project it talked to, for comparison with the dashboard.
    expect(body.steps[0].detail).toContain('testproject.supabase.co');
    // The test row must not survive the test.
    expect(state.rows).toHaveLength(0);
  });

  it('names the write path as the break when inserts fail', async () => {
    state.insertError = { message: 'permission denied for table member_applications' };
    const { body } = await run();
    expect(body.ok).toBe(false);
    expect(body.verdict).toContain('WRITE PATH IS BROKEN');
    expect(body.steps.at(-1).detail).toContain('permission denied');
  });

  it('walks the migration ladder when application_kind does not exist', async () => {
    state.missingApplicationKind = true;
    const { body } = await run();
    expect(body.ok).toBe(true);
    expect(state.rows).toHaveLength(0);
  });

  // A drifted status default is one confirmed way every new application is
  // born "already handled" and hidden from the queue on arrival. The
  // self-test is the one place that can see it happen.
  it('catches a status default that hides fresh rows on arrival', async () => {
    state.statusDefault = 'approved';
    const { body } = await run();
    expect(body.ok).toBe(false);
    const readBack = body.steps.find((s: any) => s.step === 'Read it back');
    expect(readBack.ok).toBe(false);
    expect(readBack.detail).toContain('drifted');
    // Still cleans up.
    expect(state.rows).toHaveLength(0);
  });

  it('marks the test row dismissed when it cannot be deleted', async () => {
    state.deleteFails = true;
    const { body } = await run();
    expect(body.ok).toBe(false);
    const cleanup = body.steps.find((s: any) => s.step === 'Delete the test row');
    expect(cleanup.ok).toBe(false);
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0].payload.dismissed_at).toEqual(expect.any(String));
  });
});
