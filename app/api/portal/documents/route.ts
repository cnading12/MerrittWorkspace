import { NextRequest, NextResponse } from 'next/server';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { requiredDocTypesFor, DocType } from '@/lib/portal/types';
import { validateUpload, UploadValidationError } from '@/lib/portal/uploads';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES: DocType[] = [
  'photo_id',
  'proof_of_address',
  'business_registration',
  'other',
];

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const docType = form.get('doc_type') as DocType | null;

    if (!file || !docType) {
      return NextResponse.json({ error: 'Missing file or doc_type' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(docType)) {
      return NextResponse.json({ error: 'Invalid doc_type' }, { status: 400 });
    }
    // Size + MIME allowlist. The stored content type and extension come from
    // the validator, not from the client, so an uploaded file can't be served
    // back to staff as executable HTML.
    let validated;
    try {
      validated = validateUpload(file);
    } catch (e: any) {
      if (e instanceof UploadValidationError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    const sb = getServiceSupabase();
    const path = `${member.id}/${docType}-${Date.now()}.${validated.extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: upErr } = await sb.storage
      .from('member-documents')
      .upload(path, bytes, { contentType: validated.contentType, upsert: false });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    await sb.from('member_documents').insert({
      member_id: member.id,
      doc_type: docType,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    });

    // Recompute required_docs_complete.
    const { data: existing } = await sb
      .from('member_documents')
      .select('doc_type')
      .eq('member_id', member.id);
    const have = new Set((existing || []).map((d: any) => d.doc_type));
    const complete = requiredDocTypesFor(member.designation).every((t) => have.has(t));
    if (complete !== member.required_docs_complete) {
      await sb.from('members').update({ required_docs_complete: complete }).eq('id', member.id);
    }

    const [{ data: documents }, { data: updatedMember }] = await Promise.all([
      sb
        .from('member_documents')
        .select('*')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false }),
      sb.from('members').select('*').eq('id', member.id).single(),
    ]);

    return NextResponse.json({
      documents: documents || [],
      member: updatedMember || member,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
