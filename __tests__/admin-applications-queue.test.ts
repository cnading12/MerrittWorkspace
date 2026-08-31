// Cover for GET /api/admin/applications — the read that decides whether a
// submitted trial day is ever seen.
//
// This seam had no test. `trial-application-route.test.ts` asserts that the
// row is written, and then simulates the admin queue in JavaScript; the
// actual query the admin panel runs was never executed by anything. A trial
// day that saves correctly and is then filtered out on the way back is
// indistinguishable, from the applicant's side, from one that was never
// saved at all — and that is the failure staff kept reporting.
//
// The fake below is strict about columns the way PostgREST is, so the
// migration-behind rungs of the read ladder are exercised rather than
// assumed.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const ALL_COLUMNS = [
  'id', 'member_id', 'email', 'first_name', 'last_name', 'phone', 'company_name',
  'membership_type', 'start_date', 'payload', 'status', 'decision_note', 'decided_by',
  'decided_at', 'created_at',
  'wants_trial_day', 'trial_date',                            // 20260428
  'application_kind', 'resume_token', 'id_document_path',
  'conversion_email_sent_at', 'converted_to_application_id',  // 20260824
  'is_existing_member',                                       // 20260506
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
  rows: [] as any[],
  isAdmin: true,
};

// A query builder that records its filters and, on await, applies them —
// erroring first if any filter names a column this "database" does not have.
function makeQuery() {
  const filters: Array<(r: any) => boolean> = [];
  let missingColumn: string | null = null;

  const needColumn = (col: string) => {
    if (!db.columns.includes(col) && !missingColumn) missingColumn = col;
  };

  const result = () => {
    if (missingColumn) {
      return {
        data: null,
        error: {
          code: 'PGRST204',
          message: `Could not find the '${missingColumn}' column of 'member_applications' in the schema cache`,
        },
      };
    }
    return { data: db.rows.filter((r) => filters.every((f) => f(r))), error: null };
  };

  const q: any = {
    select: () => q,
    order: () => q,
    limit: () => q,
    eq: (col: string, val: any) => {
      needColumn(col);
      filters.push((r) => r[col] === val);
      return q;
    },
    // `application_kind.eq.trial,wants_trial_day.eq.true`
    or: (expr: string) => {
      const clauses = expr.split(',').map((clause) => {
        const [col, , val] = clause.split('.');
        needColumn(col);
        return { col, val };
      });
      filters.push((r) => clauses.some((c) => String(r[c.col]) === c.val));
      return q;
    },
    then: (onOk: any, onErr: any) => Promise.resolve(result()).then(onOk, onErr),
  };
  return q;
}

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({ from: () => makeQuery() }),
}));

vi.mock('@/lib/portal/auth', async () => {
  class PortalError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  }
  return {
    PortalError,
    requireAdmin: async () => {
      if (!db.isAdmin) throw new PortalError('Forbidden', 403);
      return { id: 'admin-1' };
    },
  };
});

import { GET } from '@/app/api/admin/applications/route';

let nextId = 0;
function trialRow(over: Record<string, any> = {}) {
  nextId += 1;
  return {
    id: `trial-${nextId}`,
    email: 'ada@example.com',
    first_name: 'Ada',
    last_name: 'Lovelace',
    phone: '303-555-0100',
    company_name: null,
    membership_type: 'dedicated_desk',
    start_date: null,
    status: 'pending',
    created_at: '2026-08-30T10:00:00Z',
    wants_trial_day: true,
    trial_date: '2026-09-03',
    application_kind: 'trial',
    payload: {
      application_kind: 'trial',
      wants_trial_day: true,
      trial_seating: 'desk',
      trial_date: '2026-09-03',
    },
    ...over,
  };
}

function fullRow(over: Record<string, any> = {}) {
  nextId += 1;
  return {
    id: `full-${nextId}`,
    email: 'grace@example.com',
    first_name: 'Grace',
    last_name: 'Hopper',
    phone: '303-555-0111',
    company_name: null,
    membership_type: 'private_office_single',
    start_date: '2026-09-15',
    status: 'pending',
    created_at: '2026-08-29T10:00:00Z',
    wants_trial_day: false,
    trial_date: null,
    application_kind: 'full',
    payload: { wants_trial_day: false, application_kind: 'full' },
    ...over,
  };
}

async function queue(query = '') {
  const res = await GET(
    new NextRequest(`http://localhost/api/admin/applications${query}`, {
      headers: { authorization: 'Bearer admin-token' },
    })
  );
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  db.columns = [...ALL_COLUMNS];
  db.rows = [];
  db.isAdmin = true;
  nextId = 0;
});

describe('the trial queue is read separately from the approval queue', () => {
  it('returns a submitted trial day under `trial`, never under `standard`', async () => {
    db.rows = [trialRow()];
    const { body } = await queue();
    expect(body.trial).toHaveLength(1);
    expect(body.trial[0].first_name).toBe('Ada');
    expect(body.standard).toHaveLength(0);
  });

  it('keeps membership applications in `standard`, never under `trial`', async () => {
    db.rows = [fullRow()];
    const { body } = await queue();
    expect(body.standard).toHaveLength(1);
    expect(body.standard[0].first_name).toBe('Grace');
    expect(body.trial).toHaveLength(0);
  });

  it('shows both queues at once without either hiding the other', async () => {
    db.rows = [trialRow(), fullRow()];
    const { body } = await queue();
    expect(body.trial).toHaveLength(1);
    expect(body.standard).toHaveLength(1);
  });

  // The regression this split exists for. The trial read must not depend on
  // `status` meaning what we expect: a visit nobody can see is worse than a
  // stale card, so anything that is not explicitly handled still shows.
  it('shows a trial day whose status is not the expected `pending`', async () => {
    db.rows = [
      trialRow({ id: 'null-status', status: null }),
      trialRow({ id: 'empty-status', status: '' }),
      trialRow({ id: 'odd-status', status: 'new' }),
    ];
    const { body } = await queue();
    expect(body.trial.map((a: any) => a.id).sort()).toEqual([
      'empty-status',
      'null-status',
      'odd-status',
    ]);
  });

  // The membership queue's version of the same regression. Selecting on
  // `status = 'pending'` hid every application whose row did not read
  // exactly 'pending' — which is precisely what a live table with a drifted
  // default or constraint produces. Those rows showed on the Documents page
  // (no status filter) while this endpoint returned nothing.
  it('shows a membership application whose status is not the expected `pending`', async () => {
    db.rows = [
      fullRow({ id: 'null-status', status: null }),
      fullRow({ id: 'empty-status', status: '' }),
      fullRow({ id: 'odd-status', status: 'submitted' }),
    ];
    const { body } = await queue();
    expect(body.standard.map((a: any) => a.id).sort()).toEqual([
      'empty-status',
      'null-status',
      'odd-status',
    ]);
  });

  it('still hides decided membership applications', async () => {
    db.rows = [
      fullRow({ id: 'open' }),
      fullRow({ id: 'won', status: 'approved' }),
      fullRow({ id: 'lost', status: 'declined' }),
    ];
    const { body } = await queue();
    expect(body.standard.map((a: any) => a.id)).toEqual(['open']);
    expect(body.diagnostics.membershipRowsFound).toBe(3);
    expect(body.diagnostics.membershipRowsHandled).toBe(2);
  });

  // The panel prints these under the queue; "nothing is showing" is only
  // debuggable if the response says what the database holds and where each
  // recent row went.
  it('reports status counts and recent rows in diagnostics', async () => {
    db.rows = [
      trialRow({ id: 't1' }),
      fullRow({ id: 'f1', status: 'approved', created_at: '2026-08-31T10:00:00Z' }),
      fullRow({ id: 'f2', status: null, created_at: '2026-08-31T11:00:00Z' }),
    ];
    const { body } = await queue();
    expect(body.diagnostics.statusCounts).toEqual({ pending: 1, approved: 1, '(null)': 1 });
    const byId = Object.fromEntries(
      body.diagnostics.recentRows.map((r: any) => [r.id, r.shown_in])
    );
    expect(byId['t1']).toBe('Trial days tab');
    expect(byId['f1']).toContain('hidden');
    expect(byId['f2']).toBe('Membership applications tab');
  });

  it('hides dismissed trial days until they are asked for', async () => {
    db.rows = [trialRow({ id: 'live' }), trialRow({ id: 'dismissed', status: 'declined' })];

    const { body } = await queue();
    expect(body.trial.map((a: any) => a.id)).toEqual(['live']);
    expect(body.diagnostics.trialRowsFound).toBe(2);
    expect(body.diagnostics.trialRowsHandled).toBe(1);

    const withHandled = await queue('?include=all');
    expect(withHandled.body.trial.map((a: any) => a.id).sort()).toEqual(['dismissed', 'live']);
  });

  it('sorts trial days by the day they are coming in, soonest first', async () => {
    db.rows = [
      trialRow({ id: 'later', trial_date: '2026-09-10', payload: { application_kind: 'trial', wants_trial_day: true, trial_date: '2026-09-10' } }),
      trialRow({ id: 'sooner', trial_date: '2026-09-01', payload: { application_kind: 'trial', wants_trial_day: true, trial_date: '2026-09-01' } }),
    ];
    const { body } = await queue();
    expect(body.trial.map((a: any) => a.id)).toEqual(['sooner', 'later']);
  });

  // A full application that also ticked the old combined form's trial-day
  // box is a real visit AND a real decision. It belongs in the trial tab,
  // where staff see who is coming, and it keeps its Approve button.
  it('files a legacy combined application under trial', async () => {
    db.rows = [fullRow({
      id: 'legacy',
      wants_trial_day: true,
      trial_date: '2026-09-04',
      payload: { wants_trial_day: true, trial_date: '2026-09-04', application_kind: 'full' },
    })];
    const { body } = await queue();
    expect(body.trial.map((a: any) => a.id)).toEqual(['legacy']);
    expect(body.standard).toHaveLength(0);
  });

  it('never returns the same row in both queues', async () => {
    db.rows = [trialRow({ id: 'both' })];
    const { body } = await queue();
    const ids = [...body.trial, ...body.standard].map((a: any) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('refuses a non-admin caller', async () => {
    db.isAdmin = false;
    const { status } = await queue();
    expect(status).toBe(403);
  });
});

describe('a database behind on a migration still shows its trial days', () => {
  it('falls back to wants_trial_day when application_kind is missing', async () => {
    db.columns = [...WITHOUT_20260824];
    db.rows = [
      { ...trialRow(), application_kind: undefined },
      fullRow(),
    ];
    const { body } = await queue();
    expect(body.trial).toHaveLength(1);
    expect(body.diagnostics.readVia).toBe('wants_trial_day');
    expect(body.diagnostics.warnings.join(' ')).toContain('20260824');
  });

  it('falls back to payload when no trial column exists at all', async () => {
    db.columns = [...WITHOUT_TRIAL_COLUMNS];
    db.rows = [
      { ...trialRow(), wants_trial_day: undefined, trial_date: undefined, application_kind: undefined },
      fullRow({ wants_trial_day: undefined, trial_date: undefined, application_kind: undefined }),
    ];
    const { body } = await queue();
    expect(body.trial).toHaveLength(1);
    expect(body.trial[0].payload.application_kind).toBe('trial');
    expect(body.diagnostics.readVia).toBe('payload scan');
    expect(body.diagnostics.warnings.join(' ')).toContain('20260428');
  });

  it('does not sweep unrelated applications into the standard queue on the payload rung', async () => {
    db.columns = [...WITHOUT_TRIAL_COLUMNS];
    db.rows = [
      { ...trialRow(), wants_trial_day: undefined, trial_date: undefined, application_kind: undefined },
      fullRow({ id: 'decided', status: 'approved', wants_trial_day: undefined, trial_date: undefined, application_kind: undefined }),
    ];
    const { body } = await queue();
    expect(body.standard).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// A hidden row has to say which kind of hidden it is.
//
// "hidden (approved, declined or dismissed)" is three situations needing
// three different actions, and it missed a fourth: the existing-member form
// inserts `status: 'approved'` on submit, so its rows never enter this queue
// at all. That is the confirmed way an application shows on the Documents
// page (read without a status filter) and not on this one, and it is exactly
// the report this panel exists to answer.
// ---------------------------------------------------------------------------
describe('the diagnostics name why each hidden row is hidden', () => {
  const rowFor = async (over: Record<string, any>) => {
    db.rows = [fullRow(over)];
    const { body } = await queue();
    expect(body.diagnostics.recentRows).toHaveLength(1);
    return body.diagnostics.recentRows[0];
  };

  it('names the existing-member form rather than lumping it in with decisions', async () => {
    const row = await rowFor({ status: 'approved', is_existing_member: true });
    expect(row.shown_in).toMatch(/existing-member form/);
    expect(row.shown_in).toMatch(/Members page/);
    expect(row.shown_in).toMatch(/by design/);
  });

  it('distinguishes approved from declined', async () => {
    expect((await rowFor({ status: 'approved' })).shown_in).toMatch(/already approved/);
    db.rows = [];
    expect((await rowFor({ status: 'declined' })).shown_in).toMatch(/already declined/);
  });

  it('points a dismissed row at the Show dismissed toggle', async () => {
    const row = await rowFor({
      status: 'pending',
      payload: { dismissed_at: '2026-08-31T12:00:00Z' },
    });
    expect(row.shown_in).toMatch(/dismissed on 2026-08-31T12:00:00Z/);
    expect(row.shown_in).toMatch(/Show dismissed/);
  });

  it('shown rows still name their tab', async () => {
    db.rows = [trialRow(), fullRow()];
    const { body } = await queue();
    const by = Object.fromEntries(
      body.diagnostics.recentRows.map((r: any) => [r.kind, r.shown_in])
    );
    expect(by.trial).toBe('Trial days tab');
    expect(by.membership).toBe('Membership applications tab');
  });
});

// ---------------------------------------------------------------------------
// The panel tells the reader that an application absent from this list was
// never saved. A flat "newest 8" made that claim false as soon as a ninth row
// existed — and the row being asked about is, by definition, one the tabs are
// not showing, which is the first thing a recency cut drops.
// ---------------------------------------------------------------------------
describe('the diagnostics list never drops the row being asked about', () => {
  it('lists an old hidden row ahead of many newer visible ones', async () => {
    const hidden = fullRow({
      status: 'approved',
      first_name: 'Buried',
      created_at: '2020-01-01T00:00:00Z',
    });
    const newer = Array.from({ length: 30 }, (_, i) =>
      fullRow({ status: 'pending', created_at: `2026-08-${String(i + 1).padStart(2, '0')}T00:00:00Z` })
    );
    db.rows = [hidden, ...newer];

    const { body } = await queue();
    const ids = body.diagnostics.recentRows.map((r: any) => r.id);
    // The oldest row in the table, and the only hidden one — it must survive
    // the cut, because it is the only row anyone would be asking about.
    expect(ids).toContain(hidden.id);
    expect(body.diagnostics.hiddenRowsFound).toBe(1);
  });

  it('reports the cap and the window size so the panel can say it is truncated', async () => {
    db.rows = Array.from({ length: 40 }, () => fullRow({ status: 'pending' }));
    const { body } = await queue();
    expect(body.diagnostics.windowSize).toBe(40);
    expect(body.diagnostics.recentRowLimit).toBe(25);
    expect(body.diagnostics.recentRows.length).toBe(25);
  });

  it('stays newest-first once the hidden rows have been kept', async () => {
    db.rows = [
      fullRow({ status: 'pending', created_at: '2026-08-01T00:00:00Z' }),
      fullRow({ status: 'approved', created_at: '2026-08-03T00:00:00Z' }),
      fullRow({ status: 'pending', created_at: '2026-08-02T00:00:00Z' }),
    ];
    const { body } = await queue();
    const dates = body.diagnostics.recentRows.map((r: any) => r.created_at);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
