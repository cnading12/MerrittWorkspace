// End-to-end cover for POST /api/membership-application — the full
// membership application, and in particular the path a trial visitor takes
// when they come back to join.
//
// The gap these fill is the one that produced "I finished my application and
// it never reached the admin panel": the route's insert was best effort and
// silent. A failed write was logged to a console nobody reads, the applicant
// got "Application Submitted!", and staff got a cheerful "🆕 New Membership
// Application" — with nothing in the queue and no way for anyone to tell.
// Its sibling /api/membership-application/trial has had the opposite
// contract for a while (🚨 TRIAL DAY NOT SAVED); nothing held this route to
// it.
//
// The fake Supabase below is the same strict one that file uses: it rejects
// an insert naming a column the "database" does not have, exactly as
// PostgREST does (PGRST204), so the migration-behind rungs are real here
// rather than assumed.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { splitApplicationQueue } from '@/lib/portal/applicationQueue';
import { readConvertedApplicationId, readTrialOrigin } from '@/lib/portal/trialApplication';

// Columns present once every migration through 20260824 is applied.
const ALL_COLUMNS = [
  'id', 'member_id', 'email', 'first_name', 'last_name', 'phone', 'company_name',
  'membership_type', 'start_date', 'payload', 'status', 'decision_note', 'decided_by',
  'decided_at', 'created_at',
  'wants_trial_day', 'trial_date',                          // 20260428
  'application_kind', 'resume_token', 'id_document_path',
  'conversion_email_sent_at', 'converted_to_application_id', // 20260824
];
const WITHOUT_20260824 = ALL_COLUMNS.filter(
  (c) => !['application_kind', 'resume_token', 'id_document_path',
           'conversion_email_sent_at', 'converted_to_application_id'].includes(c)
);
const WITHOUT_TRIAL_COLUMNS = WITHOUT_20260824.filter(
  (c) => !['wants_trial_day', 'trial_date'].includes(c)
);

const db = {
  columns: ALL_COLUMNS as string[],
  insertFails: false,
  rows: [] as any[],
  emails: [] as { subject: string; to: any; text: string }[],
};

// The trial row a returning visitor's resume link resolves to.
const TRIAL_ROW = {
  id: 'trial-1',
  email: 'ada@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  application_kind: 'trial',
  status: 'pending',
  wants_trial_day: true,
  trial_date: '2026-08-12',
  resume_token: 'tok-abc',
  id_document_path: 'trial-applications/trial-1/photo_id-1.jpg',
  converted_to_application_id: null,
  created_at: new Date().toISOString(),
  payload: { application_kind: 'trial', trial_seating: 'desk', trial_plan: 'dedicated_desk', trial_date: '2026-08-12' },
};

function missingColumn(row: any) {
  return Object.keys(row).find((k) => !db.columns.includes(k));
}

function chainFor(result: any) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (onOk: any, onErr: any) => Promise.resolve(result).then(onOk, onErr),
  };
  return chain;
}

// The resume-token lookup, which is the only select this route makes against
// member_applications. Answers with the trial row when the token matches and
// this "database" still has the column to match on.
function selectChain() {
  const chain: any = {
    select: () => chain,
    eq: (col: string, value: unknown) => {
      if (col === 'resume_token') {
        if (!db.columns.includes('resume_token')) {
          chain.__result = {
            data: null,
            error: { code: '42703', message: 'column member_applications.resume_token does not exist' },
          };
        } else {
          const hit = db.rows.find((r) => r.resume_token === value) || null;
          chain.__result = { data: hit, error: null };
        }
      }
      return chain;
    },
    maybeSingle: async () => chain.__result ?? { data: null, error: null },
    single: async () => chain.__result ?? { data: null, error: null },
    then: (onOk: any, onErr: any) =>
      Promise.resolve(chain.__result ?? { data: null, error: null }).then(onOk, onErr),
    __result: { data: null, error: null } as any,
  };
  return chain;
}

const fakeSb: any = {
  from(table: string) {
    return {
      insert: (row: any) => {
        if (table !== 'member_applications') return chainFor({ data: null, error: null });
        const unknown = missingColumn(row);
        if (unknown) {
          return chainFor({
            data: null,
            error: {
              code: 'PGRST204',
              message: `Could not find the '${unknown}' column of 'member_applications' in the schema cache`,
            },
          });
        }
        if (db.insertFails) {
          return chainFor({ data: null, error: { code: '08006', message: 'connection failure' } });
        }
        const stored = {
          id: `app-${db.rows.length + 1}`,
          status: 'pending',
          created_at: new Date().toISOString(),
          ...row,
        };
        db.rows.push(stored);
        return chainFor({ data: { id: stored.id }, error: null });
      },
      update: (patch: any) => {
        const unknown = missingColumn(patch);
        if (unknown) {
          return {
            eq: () =>
              chainFor({ data: null, error: { code: 'PGRST204', message: `Could not find the '${unknown}' column` } }),
          };
        }
        return {
          eq: (_col: string, id: string) => {
            const row = db.rows.find((r) => r.id === id);
            if (row) Object.assign(row, patch);
            return chainFor({ data: null, error: null });
          },
        };
      },
      select: () => selectChain(),
    };
  },
};

vi.mock('@/lib/portal/supabaseAdmin', () => ({ getServiceSupabase: () => fakeSb }));
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (m: any) => {
        db.emails.push({ subject: m.subject, to: m.to, text: m.text || '' });
        return {};
      },
    };
  },
}));
// Availability lookups are irrelevant here and would each hit the fake
// database; the route already treats a failure as "no flag".
vi.mock('@/lib/portal/deskAvailability', () => ({
  getDeskCapacity: async () => ({ isFull: false }),
  listAvailableDesks: async () => [],
  formatDeskList: () => '',
}));
vi.mock('@/lib/portal/cafeAvailability', () => ({ getCafeCapacity: async () => ({ isFull: false }) }));
vi.mock('@/lib/portal/officeAvailability', () => ({ getOfficeAvailability: async () => ({ public: {} }) }));

process.env.RESEND_API_KEY = 'test-key';

// The route paces its Resend calls a second apart. Nothing here tests that.
vi.stubGlobal('setTimeout', ((fn: () => void) => {
  fn();
  return 0 as unknown as NodeJS.Timeout;
}) as unknown as typeof setTimeout);

async function submit(overrides: Record<string, unknown> = {}) {
  const { POST } = await import('@/app/api/membership-application/route');
  const body = {
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    phone: '303-555-0100',
    company_name: 'Analytical Engines',
    membership_type: 'dedicated_desk',
    selected_plans: [{ plan_id: 'dedicated_desk', quantity: 1 }],
    start_date: '2026-09-01',
    wants_trial_day: false,
    agrees_to_terms: true,
    ...overrides,
  };
  const res = await POST(
    new Request('http://localhost/api/membership-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randomIp() },
      body: JSON.stringify(body),
    }) as any
  );
  return { status: res.status, body: await res.json() };
}

// The route rate limits five submissions an hour per IP, in a module-level
// map that outlives a beforeEach. A fresh IP per submission keeps each test
// independent of how many ran before it.
let ipCounter = 0;
function randomIp(): string {
  ipCounter += 1;
  return `10.0.0.${ipCounter % 250}${ipCounter}`;
}

// The Membership applications tab, as /api/admin/applications builds it.
function membershipQueue() {
  return splitApplicationQueue(db.rows.filter((r) => r.status === 'pending')).standard;
}
function staffEmail() {
  return db.emails.find((e) => Array.isArray(e.to));
}

beforeEach(() => {
  db.columns = [...ALL_COLUMNS];
  db.insertFails = false;
  db.rows = [structuredClone(TRIAL_ROW)];
  db.emails = [];
});

describe('a submitted membership application reaches the admin panel', () => {
  it('stores one pending row the membership queue shows', async () => {
    const { status, body } = await submit();

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.saved).toBe(true);

    const queue = membershipQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].first_name).toBe('Ada');
    expect(queue[0].membership_type).toBe('dedicated_desk');
  });

  it('reports the database row id, not a timestamp nothing can be looked up by', async () => {
    const { body } = await submit();
    expect(body.application_id).toBe(membershipQueue()[0].id);
    expect(body.application_id).not.toMatch(/^APP-/);
    expect(staffEmail()?.text).toContain(`Application ID: ${body.application_id}`);
  });

  it('keeps the resume token out of the stored payload', async () => {
    await submit({ resume_token: 'tok-abc' });
    const [row] = membershipQueue();
    expect(JSON.stringify(row.payload)).not.toContain('tok-abc');
  });
});

describe('a trial visitor coming back to join', () => {
  it('lands in the membership queue, not the trial one', async () => {
    await submit({ resume_token: 'tok-abc' });

    const { trial, standard } = splitApplicationQueue(db.rows.filter((r) => r.status === 'pending'));
    expect(standard.map((r) => r.id)).toEqual([db.rows[1].id]);
    // The trial row itself stays visible — the visit happened — but it is
    // the only thing in that tab.
    expect(trial.map((r) => r.id)).toEqual(['trial-1']);
  });

  it('marks the trial row converted so its card stops asking staff to chase them', async () => {
    const { body } = await submit({ resume_token: 'tok-abc' });
    const trialRow = db.rows.find((r) => r.id === 'trial-1');
    expect(readConvertedApplicationId(trialRow)).toBe(body.application_id);
  });

  it('records on the application which trial day it grew out of', async () => {
    await submit({ resume_token: 'tok-abc' });
    const [row] = membershipQueue();
    expect(readTrialOrigin(row)).toEqual({ application_id: 'trial-1', trial_date: '2026-08-12' });
  });

  it('carries their trial-day photo ID onto the application', async () => {
    await submit({ resume_token: 'tok-abc' });
    const [row] = membershipQueue();
    expect(row.id_document_path).toBe(TRIAL_ROW.id_document_path);
  });

  it('tells staff on the email that this is a trial visitor coming back', async () => {
    await submit({ resume_token: 'tok-abc' });
    expect(staffEmail()?.text).toContain('TRIAL VISITOR COMING BACK TO JOIN');
  });

  it('still saves the application when the trial row cannot be found', async () => {
    const { body } = await submit({ resume_token: 'no-such-token' });
    expect(body.saved).toBe(true);
    expect(membershipQueue()).toHaveLength(1);
    expect(readTrialOrigin(membershipQueue()[0])).toBeNull();
  });
});

describe('a database that is behind on a migration still takes the application', () => {
  it('falls back to payload when 20260824 has not been applied', async () => {
    db.columns = [...WITHOUT_20260824];
    const { body } = await submit();

    expect(body.saved).toBe(true);
    const queue = membershipQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.application_kind).toBe('full');
    expect(queue[0].wants_trial_day).toBe(false);
  });

  it('still saves when 20260428 has not been applied either', async () => {
    // The old single retry dropped all three trial columns at once on a
    // regex over the error message, and lost the whole application when the
    // database was two migrations behind rather than one.
    db.columns = [...WITHOUT_TRIAL_COLUMNS];
    const { body } = await submit();

    expect(body.saved).toBe(true);
    const queue = membershipQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.trial_date).toBeNull();
    expect(queue[0].payload.application_kind).toBe('full');
  });
});

describe('an application that cannot be saved is never reported as filed', () => {
  beforeEach(() => {
    db.insertFails = true;
  });

  it('says so in the response rather than claiming success outright', async () => {
    const { body } = await submit();
    expect(body.saved).toBe(false);
    expect(membershipQueue()).toHaveLength(0);
  });

  it('puts it in the staff email subject, where a phone shows it without scrolling', async () => {
    await submit();
    expect(staffEmail()?.subject).toContain('APPLICATION NOT SAVED');
  });

  it('tells staff the email is now the only record', async () => {
    await submit();
    expect(staffEmail()?.text).toContain('THIS APPLICATION DID NOT SAVE');
    expect(staffEmail()?.text).toContain('only record');
  });

  it('still emails the applicant and still emails staff', async () => {
    const { status } = await submit();
    expect(status).toBe(200);
    expect(db.emails.some((e) => e.to === 'ada@example.com')).toBe(true);
    expect(staffEmail()).toBeTruthy();
  });
});
