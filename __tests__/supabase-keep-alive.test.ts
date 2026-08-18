import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// Guards the daily Supabase keep-alive (app/api/cron/supabase-keep-alive).
// The job exists so Supabase never pauses this Free-plan project for
// inactivity, so the things that must hold are: nobody unauthenticated can
// make us touch the database, a healthy run really does issue the query, a
// broken audit table can't make a healthy database look down, and a genuine
// failure is loud (non-2xx + staff alert).

const state = {
  // Every keep-alive read that reached the mock client.
  selects: [] as { table: string; head: boolean }[],
  // Every audit row insert attempt.
  inserts: [] as { table: string; row: any }[],
  pingError: null as { message: string } | null,
  auditError: null as { message: string } | null,
  count: 42 as number | null,
};

// Emails sent through the mocked Resend client: [payload, options].
const sends: any[][] = [];

function resetState() {
  state.selects = [];
  state.inserts = [];
  state.pingError = null;
  state.auditError = null;
  state.count = 42;
  sends.length = 0;
}

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => ({
      select: (_cols: string, opts: any) => {
        state.selects.push({ table, head: !!opts?.head });
        return Promise.resolve(
          state.pingError
            ? { count: null, error: state.pingError }
            : { count: state.count, error: null }
        );
      },
      insert: (row: any) => {
        state.inserts.push({ table, row });
        return Promise.resolve(
          state.auditError ? { error: state.auditError } : { error: null }
        );
      },
    }),
  }),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: (payload: any, options?: any) => {
        sends.push([payload, options]);
        return Promise.resolve({ data: { id: 'email-1' }, error: null });
      },
    };
  },
}));

import { GET as keepAlive } from '@/app/api/cron/supabase-keep-alive/route';
import { KEEP_ALIVE_TABLE, utcDayKey } from '@/lib/portal/keepAlive';

const SECRET = 'test-cron-secret';

function req(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/supabase-keep-alive', {
    method: 'GET',
    headers,
  });
}

beforeEach(() => {
  resetState();
  process.env.CRON_SECRET = SECRET;
  process.env.RESEND_API_KEY = 'test-resend-key';
});

describe('supabase keep-alive cron auth', () => {
  it('rejects a request with no Authorization header without touching the database', async () => {
    const res = await keepAlive(req());
    expect(res.status).toBe(401);
    expect(state.selects).toEqual([]);
    expect(state.inserts).toEqual([]);
    expect(sends).toEqual([]);
  });

  it('rejects a wrong bearer token without touching the database', async () => {
    const res = await keepAlive(req({ authorization: 'Bearer nope' }));
    expect(res.status).toBe(401);
    expect(state.selects).toEqual([]);
  });

  it('refuses to run at all when CRON_SECRET is unset, rather than running open', async () => {
    delete process.env.CRON_SECRET;
    const res = await keepAlive(req());
    expect(res.status).toBe(500);
    expect(state.selects).toEqual([]);
  });
});

describe('supabase keep-alive cron happy path', () => {
  it('issues one head-only count against a real table', async () => {
    const res = await keepAlive(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.count).toBe(42);
    // Exactly one query, head-only (no rows transferred), on a table that
    // actually exists.
    expect(state.selects).toEqual([{ table: KEEP_ALIVE_TABLE, head: true }]);
    // No email on a healthy run.
    expect(sends).toEqual([]);
  });

  it('writes a best-effort audit row for the run', async () => {
    await keepAlive(req({ authorization: `Bearer ${SECRET}` }));
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].table).toBe('cron_runs');
    expect(state.inserts[0].row.ok).toBe(true);
  });

  it('reports the database as healthy even when the audit write fails', async () => {
    // e.g. the cron_runs migration has not been applied yet.
    state.auditError = { message: 'relation "cron_runs" does not exist' };
    const res = await keepAlive(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.audited).toBe(false);
    // The READ is what decides, and it still happened.
    expect(state.selects).toEqual([{ table: KEEP_ALIVE_TABLE, head: true }]);
    expect(sends).toEqual([]);
  });
});

describe('supabase keep-alive cron failure path', () => {
  beforeEach(() => {
    state.pingError = { message: 'Project is paused' };
  });

  it('returns non-2xx so the run shows red in Vercel cron', async () => {
    const res = await keepAlive(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain('Project is paused');
  });

  it('emails staff an alert with the error and restore steps', async () => {
    await keepAlive(req({ authorization: `Bearer ${SECRET}` }));
    expect(sends).toHaveLength(1);
    const [payload, options] = sends[0];
    expect(payload.to).toContain('manager@merrittworkspace.net');
    expect(payload.subject).toMatch(/keep-alive failed/i);
    expect(payload.text).toContain('Project is paused');
    expect(payload.text).toMatch(/Restore project/i);
    // Idempotency key is scoped to the UTC day: a same-day retry dedupes,
    // a multi-day outage alerts once per day.
    expect(options.idempotencyKey).toBe(
      `supabase-keep-alive-failure-${utcDayKey()}`
    );
  });

  it('still returns non-2xx when the alert email cannot be sent', async () => {
    delete process.env.RESEND_API_KEY;
    const res = await keepAlive(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
    expect((await res.json()).alerted).toBe(false);
    expect(sends).toEqual([]);
  });
});

describe('vercel.json schedule', () => {
  const config = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8')
  );

  it('runs the keep-alive daily, not weekly', () => {
    const cron = config.crons.find(
      (c: any) => c.path === '/api/cron/supabase-keep-alive'
    );
    expect(cron).toBeDefined();
    // "<min> <hour> * * *" — every day of every month, any weekday.
    const [minute, hour, dom, month, dow] = cron.schedule.split(' ');
    expect([dom, month, dow]).toEqual(['*', '*', '*']);
    // A fixed minute/hour, i.e. once a day (Vercel Hobby allows no more).
    expect(minute).toMatch(/^\d+$/);
    expect(hour).toMatch(/^\d+$/);
  });

  it('stays within the 2-cron Vercel Hobby cap', () => {
    expect(config.crons.length).toBeLessThanOrEqual(2);
  });
});
