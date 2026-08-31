// End-to-end cover for POST /api/membership-application/trial.
//
// The gap these fill: everything about a trial day was unit-tested — the
// validator, the helpers, the follow-up cron — and nothing exercised the
// route that actually writes the row. So the one behaviour that matters to
// staff ("a submitted trial day appears under Pending applications") had no
// test at all, and the route could delete a saved application on a storage
// error without a single assertion noticing.
//
// The fake Supabase below is deliberately strict about columns: it rejects an
// insert naming a column the "database" does not have, exactly as PostgREST
// does (PGRST204), so the migration-behind paths are real here rather than
// assumed.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readTrialFlag, readTrialDate } from '@/lib/portal/trial';
import { isTrialApplication, trialPhotoIdMissing } from '@/lib/portal/trialApplication';

// Columns present once every migration through 20260824 is applied.
const ALL_COLUMNS = [
  'id', 'member_id', 'email', 'first_name', 'last_name', 'phone', 'company_name',
  'membership_type', 'start_date', 'payload', 'status', 'decision_note', 'decided_by',
  'decided_at', 'created_at',
  'wants_trial_day', 'trial_date',                     // 20260428
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

interface Call { table: string; op: string; payload: any }

const db = {
  columns: ALL_COLUMNS as string[],
  insertFails: false,
  uploadFails: false,
  rows: [] as any[],
  calls: [] as Call[],
  emails: [] as { subject: string; to: any; text: string }[],
};

function insertResult(table: string, row: any) {
  db.calls.push({ table, op: 'insert', payload: row });
  if (table === 'member_applications') {
    const unknown = Object.keys(row).find((k) => !db.columns.includes(k));
    if (unknown) {
      return {
        data: null,
        error: {
          code: 'PGRST204',
          message: `Could not find the '${unknown}' column of 'member_applications' in the schema cache`,
        },
      };
    }
    if (db.insertFails) {
      return { data: null, error: { code: '08006', message: 'connection failure' } };
    }
    // Column defaults, as the real table declares them.
    const stored = { id: `app-${db.rows.length + 1}`, status: 'pending', created_at: new Date().toISOString(), ...row };
    db.rows.push(stored);
    return { data: { id: stored.id }, error: null };
  }
  return { data: null, error: null };
}

function chainFor(result: any) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    order: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (onOk: any, onErr: any) => Promise.resolve(result).then(onOk, onErr),
  };
  return chain;
}

const fakeSb: any = {
  from(table: string) {
    return {
      insert: (row: any) => chainFor(insertResult(table, row)),
      update: (patch: any) => {
        db.calls.push({ table, op: 'update', payload: patch });
        const unknown = Object.keys(patch).find((k) => !db.columns.includes(k));
        if (table === 'member_applications' && unknown) {
          return chainFor({
            data: null,
            error: { code: 'PGRST204', message: `Could not find the '${unknown}' column` },
          });
        }
        for (const row of db.rows) Object.assign(row, patch);
        return chainFor({ data: null, error: null });
      },
      delete: () => {
        db.calls.push({ table, op: 'delete', payload: null });
        db.rows.length = 0;
        return chainFor({ data: null, error: null });
      },
      select: (cols: any) => chainFor({ data: [], error: null, count: 0 }),
    };
  },
  storage: {
    from: () => ({
      upload: async (path: string) => {
        db.calls.push({ table: 'storage', op: 'upload', payload: path });
        return db.uploadFails
          ? { error: { message: 'mime type image/heic is not supported' } }
          : { error: null };
      },
    }),
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

process.env.RESEND_API_KEY = 'test-key';

// The route paces its two Resend calls a second apart (the free plan allows
// two a second). Nothing here is testing that pacing, and thirteen real
// seconds of waiting would be the slowest file in the suite by an order of
// magnitude, so timers resolve immediately.
vi.stubGlobal('setTimeout', ((fn: () => void) => {
  fn();
  return 0 as unknown as NodeJS.Timeout;
}) as unknown as typeof setTimeout);

function futureWeekday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function submit(overrides: Record<string, string> = {}, file?: File) {
  const { POST } = await import('@/app/api/membership-application/trial/route');
  const form = new FormData();
  const fields: Record<string, string> = {
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    phone: '303-555-0100',
    company_name: 'Analytical Engines',
    seating: 'desk',
    trial_plan: 'dedicated_desk',
    trial_date: futureWeekday(),
    agrees_to_terms: 'true',
    marketing_consent: 'false',
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append(
    'id_document',
    file ?? new File([new Uint8Array([255, 216, 255])], 'licence.jpg', { type: 'image/jpeg' })
  );
  const res = await POST(
    new Request('http://localhost/api/membership-application/trial', {
      method: 'POST',
      body: form,
    }) as any
  );
  return { status: res.status, body: await res.json() };
}

// The admin queue as /api/admin/applications builds it, and as
// /admin/applications sorts it: pending rows only, trial ones pinned.
function pendingTrialApplications() {
  return db.rows.filter((r) => r.status === 'pending' && readTrialFlag(r));
}

beforeEach(() => {
  db.columns = [...ALL_COLUMNS];
  db.insertFails = false;
  db.uploadFails = false;
  db.rows = [];
  db.calls = [];
  db.emails = [];
});

describe('a submitted trial day reaches the admin panel', () => {
  it('stores one pending row the admin queue shows as a trial applicant', async () => {
    const { status, body } = await submit();

    expect(status).toBe(200);
    expect(body.success).toBe(true);

    const queue = pendingTrialApplications();
    expect(queue).toHaveLength(1);
    expect(isTrialApplication(queue[0])).toBe(true);
    expect(readTrialDate(queue[0])).toBe(futureWeekday());
    expect(queue[0].first_name).toBe('Ada');
    expect(trialPhotoIdMissing(queue[0])).toBe(false);
  });

  it('records which seating and plan they asked to try', async () => {
    await submit({ seating: 'office', trial_plan: 'private_office_double' });
    const [row] = pendingTrialApplications();
    expect(row.membership_type).toBe('private_office_double');
    expect(row.payload.trial_seating).toBe('office');
  });

  it('emails staff about the visit', async () => {
    await submit();
    const staff = db.emails.find((e) => Array.isArray(e.to));
    expect(staff?.subject).toContain('TRIAL DAY');
    expect(staff?.subject).toContain('Ada Lovelace');
  });
});

describe('a failed photo ID upload never costs us the application', () => {
  beforeEach(() => {
    db.uploadFails = true;
  });

  it('keeps the application in the pending queue', async () => {
    const { status, body } = await submit();

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.id_document_saved).toBe(false);
    expect(pendingTrialApplications()).toHaveLength(1);
    expect(db.calls.some((c) => c.table === 'member_applications' && c.op === 'delete')).toBe(false);
  });

  it('flags the row so the admin card says to check the ID at the door', async () => {
    await submit();
    const [row] = pendingTrialApplications();
    expect(trialPhotoIdMissing(row)).toBe(true);
  });

  it('tells the applicant to bring their ID', async () => {
    const { body } = await submit();
    expect(body.message).toContain('bring your photo ID');
  });

  it('tells staff to check it on arrival', async () => {
    await submit();
    const staff = db.emails.find((e) => Array.isArray(e.to));
    expect(staff?.text).toContain('Check it at the door');
  });
});

describe('a database that is behind on a migration still takes the application', () => {
  it('falls back to payload when 20260824 has not been applied', async () => {
    db.columns = [...WITHOUT_20260824];
    const { status } = await submit();

    expect(status).toBe(200);
    const queue = pendingTrialApplications();
    expect(queue).toHaveLength(1);
    // The dedicated columns are gone, so the admin panel reads the kind and
    // the date out of payload — which is the whole point of mirroring them.
    expect(isTrialApplication(queue[0])).toBe(true);
    expect(readTrialDate(queue[0])).toBe(futureWeekday());
  });

  it('falls back again when the trial columns from 20260428 are missing too', async () => {
    db.columns = [...WITHOUT_TRIAL_COLUMNS];
    const { status, body } = await submit();

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(db.rows).toHaveLength(1);
    expect(isTrialApplication(db.rows[0])).toBe(true);
  });
});

describe('when the application cannot be saved at all', () => {
  beforeEach(() => {
    db.insertFails = true;
  });

  it('still confirms the trial day to the applicant', async () => {
    const { status, body } = await submit();
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.application_id).toBeNull();
  });

  it('shouts about it in the staff email, which is now the only record', async () => {
    await submit();
    const staff = db.emails.find((e) => Array.isArray(e.to));
    expect(staff?.subject).toContain('NOT SAVED');
    expect(staff?.text).toContain('did NOT save to the admin panel');
    expect(staff?.text).toContain('ada@example.com');
  });
});

describe('photo ID validation', () => {
  it('refuses a document that would run as a page when staff open it', async () => {
    const svg = new File(['<svg onload="alert(1)"/>'], 'id.svg', { type: 'image/svg+xml' });
    const { status } = await submit({}, svg);
    expect(status).toBe(400);
    expect(db.rows).toHaveLength(0);
  });

  it('names the stored object from the validated type, not the filename', async () => {
    await submit({}, new File([new Uint8Array([1])], 'licence.php.jpeg', { type: 'image/jpeg' }));
    const upload = db.calls.find((c) => c.table === 'storage');
    expect(upload?.payload).toMatch(/^trial-applications\/app-1\/photo_id-\d+\.jpg$/);
  });
});
