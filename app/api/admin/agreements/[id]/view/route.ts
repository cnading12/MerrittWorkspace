import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import {
  TERMS_AND_CONDITIONS_TEXT,
  MERRITT_SIGNATORY,
  renderFeeAgreementText,
  type FeeAgreementContext,
} from '@/lib/portal/legal';

export const dynamic = 'force-dynamic';

// Renders an admin-only printable HTML view of a signed agreement so it can
// be referenced, archived, or saved as PDF from the browser. Agreements are
// stored in `member_agreements` (text + signature audit trail), not as files
// in storage — this route reconstructs the document the member saw and
// signed.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();

    const { data: agreement, error } = await sb
      .from('member_agreements')
      .select('*, member:members(id, first_name, last_name, email, company_name)')
      .eq('id', params.id)
      .single();
    if (error || !agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const member = agreement.member;
    const memberName = member
      ? `${member.first_name} ${member.last_name}`
      : agreement.signature_name;
    const signedDate = new Date(agreement.signed_at).toLocaleDateString();
    const signedTimestamp = new Date(agreement.signed_at).toLocaleString();

    const body = buildDocumentBody(agreement, memberName, signedDate);

    const html = wrapInPrintableHtml({
      title: titleFor(agreement.agreement_type),
      memberName,
      memberEmail: member?.email || '',
      body,
      signatureName: agreement.signature_name,
      signedTimestamp,
      documentVersion: agreement.document_version,
      ipAddress: agreement.ip_address,
      userAgent: agreement.user_agent,
    });

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

function titleFor(type: string): string {
  switch (type) {
    case 'fee_agreement':
      return 'Merritt Workspace Fee Agreement';
    case 'terms_and_conditions':
      return 'Merritt Workspace Terms & Conditions';
    case 'member_agreement':
      return 'Merritt Workspace Member Agreement';
    default:
      return 'Merritt Workspace Agreement';
  }
}

function buildDocumentBody(
  agreement: any,
  memberName: string,
  signedDate: string
): string {
  if (agreement.agreement_type === 'terms_and_conditions') {
    return escapeHtml(TERMS_AND_CONDITIONS_TEXT);
  }
  if (agreement.agreement_type === 'member_agreement') {
    return escapeHtml(
      `I, ${memberName}, agree to become a member of Merritt Workspace under the Fee Agreement and Terms & Conditions referenced above.`
    );
  }
  if (agreement.agreement_type === 'fee_agreement') {
    const meta = agreement.metadata || {};
    const invoicing = meta.invoicing || {};
    const ctx: FeeAgreementContext = {
      member: {
        name: memberName,
        street: meta.street || '',
        cityStateZip: meta.city_state_zip || '',
        phone: meta.phone || '',
        email: meta.email || '',
        federalId: meta.federal_id || null,
      },
      invoicing: {
        companyName: invoicing.company_name || '',
        street: invoicing.street || '',
        cityStateZip: invoicing.city_state_zip || '',
        contactName: invoicing.contact_name || memberName,
        phone: invoicing.phone || '',
        email: invoicing.email || '',
      },
      designationLabel: meta.designation_label || '',
      monthlyCostCents: meta.monthly_cost_cents || 0,
      termStart: meta.term_start || signedDate,
      termEnd: meta.term_end || signedDate,
      paymentMethod: meta.payment_method === 'ach' ? 'ach' : 'card',
      signedDate,
      memberTitle: meta.member_title || null,
    };
    return escapeHtml(renderFeeAgreementText(ctx));
  }
  return '';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapInPrintableHtml(ctx: {
  title: string;
  memberName: string;
  memberEmail: string;
  body: string;
  signatureName: string;
  signedTimestamp: string;
  documentVersion: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(ctx.title)} — ${escapeHtml(ctx.memberName)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    max-width: 780px;
    margin: 40px auto;
    padding: 0 24px 64px;
    color: #111827;
    background: #f9fafb;
  }
  .page {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 48px 56px;
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
  pre.doc {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.55;
    background: #fff;
    padding: 0;
    color: #1f2937;
  }
  .audit {
    margin-top: 40px;
    padding-top: 24px;
    border-top: 2px solid #e5e7eb;
  }
  .audit h2 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: #6b7280;
    margin: 0 0 12px;
  }
  .audit table {
    width: 100%;
    font-size: 12px;
    border-collapse: collapse;
  }
  .audit td {
    padding: 4px 0;
    vertical-align: top;
    color: #374151;
  }
  .audit td.label {
    width: 160px;
    color: #6b7280;
    font-weight: 500;
  }
  .signature-stamp {
    margin-top: 20px;
    padding: 14px 18px;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 8px;
    font-size: 13px;
    color: #065f46;
  }
  .signature-stamp strong { color: #064e3b; }
  @media print {
    body { background: #fff; margin: 0; }
    .page { border: 0; box-shadow: none; padding: 0; }
    .toolbar { display: none; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <div style="font-size:12px;color:#6b7280">
    Signed document · confidential · Merritt Workspace admin archive
  </div>
  <div class="actions">
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
    <button type="button" onclick="window.close()">Close tab</button>
  </div>
</div>
<div class="page">
  <h1>${escapeHtml(ctx.title)}</h1>
  <div class="subtitle">
    ${escapeHtml(ctx.memberName)}${ctx.memberEmail ? ` · ${escapeHtml(ctx.memberEmail)}` : ''}
  </div>
  <pre class="doc">${ctx.body}</pre>

  <div class="signature-stamp">
    <strong>✓ Electronically signed</strong> by
    <strong>${escapeHtml(ctx.signatureName)}</strong>
    on ${escapeHtml(ctx.signedTimestamp)}.
  </div>

  <div class="audit">
    <h2>Audit trail</h2>
    <table>
      <tr><td class="label">Signed at</td><td>${escapeHtml(ctx.signedTimestamp)}</td></tr>
      <tr><td class="label">Signature name</td><td>${escapeHtml(ctx.signatureName)}</td></tr>
      ${
        ctx.documentVersion
          ? `<tr><td class="label">Document version</td><td>${escapeHtml(ctx.documentVersion)}</td></tr>`
          : ''
      }
      ${
        ctx.ipAddress
          ? `<tr><td class="label">IP address</td><td>${escapeHtml(ctx.ipAddress)}</td></tr>`
          : ''
      }
      ${
        ctx.userAgent
          ? `<tr><td class="label">User agent</td><td>${escapeHtml(ctx.userAgent)}</td></tr>`
          : ''
      }
    </table>
  </div>
</div>
</body>
</html>`;
}
