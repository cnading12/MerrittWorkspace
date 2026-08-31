#!/usr/bin/env node
// Why a submitted trial day is (or is not) reaching the admin panel.
//
//   npm run diagnose:trial          read-only checks
//   npm run diagnose:trial -- --write   also writes a throwaway application
//                                       and photo ID, then deletes both
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
// environment or from .env.local. The service key is the one the API routes
// use, so this sees exactly what they see — including past RLS, which is the
// point: a check run as anyone else would prove nothing about the route.
//
// The checks, in the order a trial application passes through them:
//   1. Which columns member_applications actually has → which migrations are
//      applied. A missing one no longer loses the application (the route
//      falls back), but it does explain a missing resume link or photo ID.
//   2. What the admin queue query returns, verbatim — the same select the
//      admin page makes, so "nothing shows up" gets a yes or no answer here.
//   3. Every trial application from the last 60 days, with what became of it.
//   4. A storage round trip under trial-applications/, which is the one step
//      that used to delete a saved application when it failed.
//   5. With --write: the exact insert the route performs, then rolled back.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const WRITE = process.argv.includes('--write');

function loadEnvLocal() {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, '');
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    // No .env.local — the variables may already be exported.
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy them from the Vercel project settings (or Supabase → Project Settings → API)\n' +
      'into .env.local, or export them before running this.'
  );
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const problems = [];
const ok = (m) => console.log(`  ✅ ${m}`);
const warn = (m) => console.log(`  ⚠️  ${m}`);
const bad = (m) => {
  console.log(`  ❌ ${m}`);
  problems.push(m);
};
const heading = (n, t) => console.log(`\n${n}. ${t}\n${'─'.repeat(60)}`);

// ── 1. migration state ────────────────────────────────────────────────────
// Probed one column at a time: selecting a column a table does not have is
// an error naming that column, which is a more direct answer than reading
// information_schema through PostgREST (which does not expose it).
async function columnExists(column) {
  const { error } = await sb.from('member_applications').select(column).limit(1);
  return !error;
}

heading(1, 'Schema — is member_applications migrated?');
const REQUIRED = {
  wants_trial_day: '20260428_trial_day_applicants.sql',
  trial_date: '20260428_trial_day_applicants.sql',
  application_kind: '20260824_trial_application_split.sql',
  resume_token: '20260824_trial_application_split.sql',
  id_document_path: '20260824_trial_application_split.sql',
  conversion_email_sent_at: '20260824_trial_application_split.sql',
  converted_to_application_id: '20260824_trial_application_split.sql',
};
const missing = new Map();
for (const [column, migration] of Object.entries(REQUIRED)) {
  if (await columnExists(column)) {
    ok(`${column}`);
  } else {
    warn(`${column} is MISSING — apply ${migration}`);
    missing.set(migration, true);
  }
}
if (missing.size) {
  console.log(
    `\n  Applications are still saved without these columns, but ${[...missing.keys()].join(', ')}\n` +
      '  should be pasted into the Supabase SQL editor: without them a trial day has no\n' +
      '  resume link and no stored photo ID.'
  );
} else {
  ok('every trial-day column is present');
}

// ── 2. the admin queue, exactly as the admin page asks for it ─────────────
heading(2, 'Admin queue — what /admin/applications would show right now');
const { data: pending, error: pendingErr } = await sb
  .from('member_applications')
  .select('*')
  .eq('status', 'pending')
  .order('created_at', { ascending: false });

if (pendingErr) {
  bad(`the admin applications query FAILS: ${pendingErr.message}`);
} else {
  const isTrial = (r) =>
    r.wants_trial_day === true || r.payload?.wants_trial_day === true;
  const trial = pending.filter(isTrial);
  console.log(`  ${pending.length} pending application(s): ${trial.length} trial day, ${pending.length - trial.length} standard`);
  for (const r of trial) {
    console.log(
      `    • ${r.first_name} ${r.last_name} <${r.email}> — trial ${r.trial_date || r.payload?.trial_date || '?'}` +
        ` — ${r.membership_type || '?'} — submitted ${new Date(r.created_at).toLocaleString()}`
    );
  }
  if (trial.length === 0) ok('no trial applications are waiting (nothing is stuck)');
}

// ── 3. every trial row of the last 60 days ────────────────────────────────
heading(3, 'Trial applications submitted in the last 60 days');
const since = new Date(Date.now() - 60 * 864e5).toISOString();
const { data: recent, error: recentErr } = await sb
  .from('member_applications')
  .select('*')
  .gte('created_at', since)
  .order('created_at', { ascending: false });

if (recentErr) {
  bad(`could not read recent applications: ${recentErr.message}`);
} else {
  const trial = recent.filter(
    (r) => r.wants_trial_day === true || r.payload?.wants_trial_day === true
  );
  if (trial.length === 0) {
    warn(
      'NONE. If someone has submitted the trial form in that window, their application\n' +
        '     never reached the database — check the Vercel function logs for\n' +
        '     /api/membership-application/trial and the storage check below.'
    );
  } else {
    console.log(`  ${trial.length} trial application(s), ${recent.length} application(s) in total:`);
    for (const r of trial) {
      const kind = r.application_kind || r.payload?.application_kind || 'full(legacy)';
      const id =
        'id_document_path' in r
          ? r.id_document_path
            ? 'ID stored'
            : 'NO ID STORED'
          : 'ID column missing';
      console.log(
        `    • ${new Date(r.created_at).toISOString().slice(0, 10)}  ${r.status.padEnd(8)} ${String(kind).padEnd(12)} ${id}  ${r.first_name} ${r.last_name}`
      );
    }
  }
}

// ── 4. storage ────────────────────────────────────────────────────────────
heading(4, 'Storage — can a photo ID be written where the route writes it?');
const probePath = `trial-applications/diagnostic-${Date.now()}/photo_id-probe.jpg`;
const { error: upErr } = await sb.storage
  .from('member-documents')
  .upload(probePath, new Uint8Array([255, 216, 255, 217]), {
    contentType: 'image/jpeg',
    upsert: false,
  });
if (upErr) {
  bad(`upload to member-documents FAILED: ${upErr.message}`);
  console.log(
    '     Trial applications are still saved when this fails (the route no longer\n' +
      '     deletes them), but the photo ID is lost and staff must check it at the door.'
  );
} else {
  ok('uploaded and readable');
  const { error: rmErr } = await sb.storage.from('member-documents').remove([probePath]);
  if (rmErr) warn(`could not clean up the probe file ${probePath}: ${rmErr.message}`);
}

// ── 5. the real insert, rolled back ───────────────────────────────────────
if (WRITE) {
  heading(5, 'Insert — the exact row the trial route writes (then deleted)');
  const row = {
    email: 'diagnostic@merrittworkspace.net',
    first_name: 'Diagnostic',
    last_name: 'Probe',
    phone: '000-000-0000',
    company_name: null,
    membership_type: 'dedicated_desk',
    start_date: null,
    wants_trial_day: true,
    trial_date: new Date(Date.now() + 864e5).toISOString().slice(0, 10),
    payload: { application_kind: 'trial', trial_seating: 'desk', diagnostic: true },
    application_kind: 'trial',
    resume_token: `diagnostic-${Date.now()}`,
  };
  for (const column of Object.keys(REQUIRED)) {
    if (!(await columnExists(column)) && column in row) delete row[column];
  }
  const { data, error } = await sb
    .from('member_applications')
    .insert(row)
    .select('id, status')
    .single();
  if (error) {
    bad(`the insert the route performs FAILS: ${error.message}`);
  } else {
    ok(`inserted ${data.id} with status "${data.status}"`);
    if (data.status !== 'pending') {
      bad(
        `rows land as "${data.status}", not "pending" — the admin queue only lists pending rows, ` +
          'which would hide every new application'
      );
    }
    const { error: delErr } = await sb.from('member_applications').delete().eq('id', data.id);
    if (delErr) warn(`could not delete the probe row ${data.id}: ${delErr.message}`);
    else ok('probe row deleted');
  }
} else {
  heading(5, 'Insert — skipped');
  console.log('  Re-run with --write to insert (and immediately delete) a probe application.');
}

console.log(`\n${'═'.repeat(60)}`);
if (problems.length === 0) {
  console.log('No blocking problem found in the write path.');
  console.log(
    'If an applicant still reports a submission that never appeared, check the Vercel\n' +
      'logs for /api/membership-application/trial around the time they submitted.'
  );
} else {
  console.log(`${problems.length} problem(s) found:`);
  for (const p of problems) console.log(`  ❌ ${p}`);
}
process.exit(problems.length ? 1 : 0);
