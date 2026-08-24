import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { readTrialFlag, readTrialDate } from '@/lib/portal/trial';
import { isTrialApplication } from '@/lib/portal/trialApplication';

export const dynamic = 'force-dynamic';

// Renders an admin-only printable HTML view of a submitted membership
// application so it can be referenced, archived, or saved as PDF from the
// browser — the same way signed agreements are viewed. Applications are
// stored in `member_applications` with the form body spread across dedicated
// columns plus a `payload` JSONB catch-all; this route reconstructs the full
// submission (housing + membership references, emergency contact, etc.) into
// a readable document.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();

    const { data: application, error } = await sb
      .from('member_applications')
      .select('*')
      .eq('id', params.id)
      .single();
    if (error || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const html = renderApplicationHtml(application);
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

function renderApplicationHtml(app: any): string {
  const payload: Record<string, any> = app.payload || {};
  const applicantName = `${app.first_name || ''} ${app.last_name || ''}`.trim();
  const submittedAt = new Date(app.created_at).toLocaleString();
  const submittedDate = new Date(app.created_at).toLocaleDateString();
  const decidedAt = app.decided_at
    ? new Date(app.decided_at).toLocaleString()
    : null;

  const membershipTypeLabel = app.membership_type
    ? app.membership_type
        .replace(/_/g, ' ')
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : '—';

  const wantsTrial = readTrialFlag(app);
  const trialDate = readTrialDate(app);

  const sections: string[] = [];

  // Highlight trial-day applications up top so the admin can immediately see
  // which day the applicant requested for their trial. This is the single
  // most actionable piece of info for a trial applicant.
  if (wantsTrial) {
    sections.push(trialBanner(trialDate));
  }

  // A short-form trial application has no professional details, references,
  // emergency contact or plan — by design. Rendering those sections would be
  // eight "Not provided." blocks implying the applicant skipped something,
  // when in fact we never asked. So the trial view stops after the summary.
  const shortFormTrial = isTrialApplication(app);

  sections.push(
    tableSection('Application summary', [
      ['Applicant', applicantName || '—'],
      ['Email', app.email || '—'],
      ['Phone', app.phone || '—'],
      ['Company', app.company_name || '—'],
      ...(shortFormTrial
        ? ([
            ['Wants to try', payload.trial_seating === 'office' ? 'Private office' : 'Dedicated desk'],
            ['Trial day date', formatTrialDate(trialDate)],
            ['Photo ID', app.id_document_path ? 'On file' : 'Not attached'],
          ] as [string, string][])
        : ([
            ['Membership type', membershipTypeLabel],
            ['Trial day requested', wantsTrial ? 'Yes' : 'No'],
            ...(wantsTrial
              ? [['Trial day date', formatTrialDate(trialDate)] as [string, string]]
              : []),
            ['Preferred start date', app.start_date || '—'],
          ] as [string, string][])),
      ['Status', (app.status || 'pending').toUpperCase()],
      ['Submitted', submittedAt],
      ...(decidedAt ? [['Decided', decidedAt] as [string, string]] : []),
      ...(app.decision_note
        ? [['Decision note', app.decision_note] as [string, string]]
        : []),
    ])
  );

  if (shortFormTrial) {
    sections.push(
      emptySection(
        'Trial day application',
        'This is a trial day application, not a membership application. Contact details and a photo ID are all we ask for — there is nothing to approve. If they decide to join, send them the membership application from the applications page; it arrives prefilled with everything above.'
      )
    );
    return renderDocument(app, applicantName, submittedDate, sections);
  }

  sections.push(
    tableSection('Professional information', [
      ['Company', app.company_name || '—'],
      ['Job title', payload.job_title || '—'],
      ['Industry', payload.industry || '—'],
      ['Team size', payload.team_size != null ? String(payload.team_size) : '—'],
      ['LinkedIn', payload.linkedin_url || '—'],
      ['Website', payload.website_url || '—'],
    ])
  );

  sections.push(
    tableSection('Work preferences', [
      [
        'Work style',
        Array.isArray(payload.work_style) && payload.work_style.length
          ? payload.work_style.join(', ')
          : '—',
      ],
      ['Meeting frequency', payload.meeting_frequency || '—'],
      ['Referral source', payload.referral_source || '—'],
    ])
  );

  const housing = payload.housing_reference || {};
  if (housing.type) {
    const housingLabel =
      housing.type === 'mortgage' ? 'Mortgage company' : 'Landlord';
    sections.push(
      tableSection('Housing reference', [
        ['Reference type', housingLabel],
        [housingLabel, housing.company_name || '—'],
        ['Contact name', housing.contact_name || '—'],
        ['Contact phone', housing.contact_phone || '—'],
        ['Contact email', housing.contact_email || '—'],
        ['Property address', housing.property_address || '—'],
        [
          'Dates',
          housing.start_date || housing.end_date
            ? `${housing.start_date || 'N/A'} to ${housing.end_date || 'Present'}`
            : '—',
        ],
      ])
    );
  } else {
    sections.push(emptySection('Housing reference', 'Not provided.'));
  }

  const membership = payload.membership_reference || {};
  if (membership.type) {
    const label = membership.type === 'gym' ? 'Gym' : 'Other workspace';
    const nameLabel = membership.type === 'gym' ? 'Gym name' : 'Workspace name';
    sections.push(
      tableSection('Membership reference', [
        ['Reference type', label],
        [nameLabel, membership.facility_name || '—'],
        ['Contact name', membership.contact_name || '—'],
        ['Contact phone', membership.contact_phone || '—'],
        ['Contact email', membership.contact_email || '—'],
        [
          'Dates',
          membership.start_date || membership.end_date
            ? `${membership.start_date || 'N/A'} to ${membership.end_date || 'Present'}`
            : '—',
        ],
      ])
    );
  } else {
    sections.push(emptySection('Membership reference', 'Not provided.'));
  }

  sections.push(
    tableSection('Emergency contact', [
      ['Name', payload.emergency_contact_name || '—'],
      ['Phone', payload.emergency_contact_phone || '—'],
      ['Relationship', payload.emergency_contact_relationship || '—'],
    ])
  );

  if (payload.special_requirements) {
    sections.push(
      `<section><h2>Special requirements</h2><p class="prose">${escapeHtml(
        String(payload.special_requirements)
      )}</p></section>`
    );
  }

  sections.push(
    tableSection('Consents & agreements', [
      [
        'Terms & conditions',
        payload.agrees_to_terms ? 'Agreed' : 'Not agreed',
      ],
      [
        'Marketing communications',
        payload.marketing_consent ? 'Opted in' : 'Opted out',
      ],
    ])
  );

  return renderDocument(app, applicantName, submittedDate, sections);
}

// The printable shell around whichever sections were assembled above.
// Extracted so the trial-day view can return early with its own short
// section list rather than falling through the membership-only ones.
function renderDocument(
  app: any,
  applicantName: string,
  submittedDate: string,
  sections: string[]
): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${app.application_kind === 'trial' ? 'Trial Day Application' : 'Membership Application'} — ${escapeHtml(applicantName || app.email || '')}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    max-width: 820px;
    margin: 40px auto;
    padding: 0 24px 64px;
    color: #111827;
    background: #f9fafb;
  }
  .page {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 40px 48px;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
  }
  h1 {
    font-size: 22px;
    margin: 0 0 4px;
    color: #111827;
  }
  .subtitle {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 32px;
  }
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .toolbar .actions button, .toolbar .actions a {
    font-size: 13px;
    border: 1px solid #d1d5db;
    background: #fff;
    padding: 6px 14px;
    border-radius: 6px;
    text-decoration: none;
    color: #111827;
    cursor: pointer;
  }
  .toolbar .actions button:hover, .toolbar .actions a:hover {
    background: #f3f4f6;
  }
  section {
    margin-top: 28px;
  }
  section:first-of-type {
    margin-top: 0;
  }
  section h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: #6b7280;
    margin: 0 0 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  table td {
    padding: 6px 0;
    vertical-align: top;
    color: #1f2937;
    border-bottom: 1px solid #f3f4f6;
  }
  table td.label {
    width: 200px;
    color: #6b7280;
    font-weight: 500;
  }
  .prose {
    font-size: 13px;
    line-height: 1.55;
    color: #1f2937;
    white-space: pre-wrap;
  }
  .status-badge {
    display: inline-block;
    font-size: 11px;
    letter-spacing: .04em;
    padding: 2px 8px;
    border-radius: 999px;
    background: #fef3c7;
    color: #92400e;
    margin-left: 8px;
    vertical-align: middle;
  }
  .status-badge.approved { background: #d1fae5; color: #065f46; }
  .status-badge.declined { background: #fee2e2; color: #991b1b; }
  .empty { color: #9ca3af; font-size: 13px; font-style: italic; }
  .trial-banner {
    margin-top: 0;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    border-left: 4px solid #ea580c;
    border-radius: 8px;
    padding: 16px 20px;
  }
  .trial-banner-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .06em;
    font-weight: 700;
    color: #c2410c;
  }
  .trial-banner-date {
    font-size: 20px;
    font-weight: 700;
    color: #9a3412;
    margin-top: 4px;
  }
  .trial-banner-sub {
    font-size: 12px;
    color: #ea580c;
    margin-top: 2px;
  }
  @media print {
    body { background: #fff; margin: 0; }
    .page { border: 0; box-shadow: none; padding: 0; }
    .toolbar { display: none; }
    .trial-banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <div style="font-size:12px;color:#6b7280">
    Submitted application · confidential · Merritt Workspace admin archive
  </div>
  <div class="actions">
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
    <button type="button" onclick="window.close()">Close tab</button>
  </div>
</div>
<div class="page">
  <h1>
    ${app.application_kind === 'trial' ? 'Trial Day Application' : 'Membership Application'}
    <span class="status-badge ${escapeHtml(app.status || 'pending')}">${escapeHtml(
      (app.status || 'pending').toUpperCase()
    )}</span>
  </h1>
  <div class="subtitle">
    ${escapeHtml(applicantName || app.email || '')}
    ${app.email && applicantName ? ` · ${escapeHtml(app.email)}` : ''}
    · Submitted ${escapeHtml(submittedDate)}
  </div>
  ${sections.join('\n')}
</div>
</body>
</html>`;
}

// Formats a trial date (stored as a YYYY-MM-DD string) into a friendly,
// long-form date. Parsed as a local date to avoid the off-by-one shift that
// `new Date('YYYY-MM-DD')` causes by treating the string as UTC midnight.
function formatTrialDate(date: string | null): string {
  if (!date) return 'Not specified';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Prominent callout for trial-day applicants so the requested trial date is
// impossible to miss when an admin opens the application view.
function trialBanner(date: string | null): string {
  return `<section class="trial-banner">
    <div class="trial-banner-label">🟧 Trial Day Applicant</div>
    <div class="trial-banner-date">${escapeHtml(formatTrialDate(date))}</div>
    <div class="trial-banner-sub">Requested trial day date</div>
  </section>`;
}

function tableSection(title: string, rows: Array<[string, string]>): string {
  const rowHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td class="label">${escapeHtml(label)}</td><td>${escapeHtml(
          value
        )}</td></tr>`
    )
    .join('');
  return `<section><h2>${escapeHtml(title)}</h2><table>${rowHtml}</table></section>`;
}

function emptySection(title: string, message: string): string {
  return `<section><h2>${escapeHtml(title)}</h2><div class="empty">${escapeHtml(
    message
  )}</div></section>`;
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
