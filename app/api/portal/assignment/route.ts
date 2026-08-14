import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import {
  workspaceAssignmentNotificationEmail,
  PORTAL_FROM,
  PORTAL_REPLY_TO,
} from '@/lib/portal/emails';
import { DESIGNATION_LABELS, type MemberDesignation } from '@/lib/portal/types';
import { normalizeDeskNumber, deskTakenMessage } from '@/lib/portal/desks';
import { findDeskClaim } from '@/lib/portal/deskClaims';

export const dynamic = 'force-dynamic';

// Which assignment fields a member can edit themselves, based on their
// designation. Office members pick an office; dedicated-desk members pick a
// desk. Other designations can edit neither — flex/trial members don't have
// a fixed seat, and admins still control the field via the admin panel.
//
// Private dedicated desks are the notable exception: they sit in an office
// we've converted into a dedicated-desk area, and WHICH office depends on
// which rooms are free and how we're laying them out. Member services makes
// that call, so those members can't self-assign — see the message below.
function allowedFields(designation: MemberDesignation | null): {
  desk: boolean;
  office: boolean;
} {
  switch (designation) {
    case 'dedicated_desk':
    case 'one_day_dedicated_desk':
      return { desk: true, office: false };
    case 'private_office_single':
    case 'private_office_double':
    case 'private_office_large':
      return { desk: false, office: true };
    default:
      return { desk: false, office: false };
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    const body = await req.json().catch(() => ({}));

    const allowed = allowedFields(member.designation);
    if (!allowed.desk && !allowed.office) {
      return NextResponse.json(
        {
          error:
            member.designation === 'private_dedicated_desk'
              ? 'Member services assigns private dedicated desk areas. Call or email us and we\'ll confirm your room.'
              : 'Your membership type does not include a fixed desk or office assignment. Contact member services if you have questions.',
        },
        { status: 400 },
      );
    }

    const sb = getServiceSupabase();

    const update: Record<string, string | null> = {};
    if (allowed.desk && 'desk_number' in body) {
      const raw = typeof body.desk_number === 'string' ? body.desk_number.trim() : '';
      if (!raw) {
        // Allow clearing the desk so a member can correct a mistake.
        update.desk_number = null;
      } else {
        // Enforce the DD# format and the DD1–DD26 range (minus retired desks
        // like DD5, which no longer exists).
        const result = normalizeDeskNumber(raw);
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        // Reject desks that are already occupied on the seating chart — whether
        // claimed by another portal member OR manually entered by staff for
        // someone who isn't on the portal yet. Both sources count as taken.
        const claim = await findDeskClaim(sb, result.value, {
          excludeMemberId: member.id,
        });
        if (claim) {
          return NextResponse.json(
            { error: deskTakenMessage(result.value) },
            { status: 409 },
          );
        }
        update.desk_number = result.value;
      }
    }
    if (allowed.office && 'office_number' in body) {
      const v = typeof body.office_number === 'string' ? body.office_number.trim() : '';
      update.office_number = v ? v.slice(0, 32) : null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No assignment fields provided' }, { status: 400 });
    }
    const { data: updated, error } = await sb
      .from('members')
      .update(update)
      .eq('id', member.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    // Notify admin so they can confirm the seat is available and update any
    // building-side records. Best-effort — failure here doesn't block the
    // member's update.
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const designationLabel = member.designation
          ? DESIGNATION_LABELS[member.designation]
          : 'Unknown';
        const tpl = workspaceAssignmentNotificationEmail({
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
          designationLabel,
          deskNumber: 'desk_number' in update ? update.desk_number : member.desk_number,
          officeNumber:
            'office_number' in update ? update.office_number : member.office_number,
          adminUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/admin/members`,
        });
        await resend.emails.send({
          from: PORTAL_FROM,
          to: ['memberservices@merrittworkspace.net', 'manager@merrittworkspace.net'],
          replyTo: PORTAL_REPLY_TO,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        });
      } catch (e) {
        console.error('Failed to send workspace assignment email', e);
      }
    }

    return NextResponse.json({ member: updated });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
