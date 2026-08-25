// app/api/bookings/route.ts - guest (non-member) paid bookings.
// Booking data lives in Google Calendar + Stripe metadata until the webhook
// persists it; the only thing written up-front is the guest's photo ID,
// which goes to the member-documents storage bucket.
import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarAPI } from '@/lib/google-calendar';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import Stripe from 'stripe';
import {
  createConferenceCheckoutSession,
  ConferenceCheckoutError,
} from '@/lib/bookings/conferenceCheckout';
import { validateUpload, UploadValidationError } from '@/lib/portal/uploads';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

// Helper type for bookings (no database needed)
interface SimpleBooking {
  id: string;
  room_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  company?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_amount: number;
  attendees: number;
  purpose?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'completed';
  confirmation_sent: boolean;
  is_member_booking?: boolean;
  created_at: string;
  updated_at: string;
}

export async function POST(request: NextRequest) {
  try {
    // Guests submit multipart/form-data so the ID photo rides along with the
    // booking fields; plain JSON is still accepted for backward compatibility
    // (it can no longer complete a paid booking — the ID is required).
    let bookingData: Record<string, any>;
    let idFile: File | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const fields: Record<string, any> = {};
      form.forEach((value, key) => {
        if (key !== 'id_document') fields[key] = value;
      });
      bookingData = fields;
      const maybeFile = form.get('id_document');
      idFile = maybeFile instanceof File && maybeFile.size > 0 ? maybeFile : null;
      // Numeric fields arrive as strings in form data.
      if (bookingData.duration_hours) bookingData.duration_hours = parseFloat(bookingData.duration_hours);
      if (bookingData.attendees) bookingData.attendees = parseInt(bookingData.attendees, 10);
      if (bookingData.total_amount) bookingData.total_amount = parseFloat(bookingData.total_amount);
      if (bookingData.is_member_booking !== undefined) {
        bookingData.is_member_booking = bookingData.is_member_booking === 'true';
      }
    } else {
      bookingData = await request.json();
    }
    console.log('📥 Received booking data:', { ...bookingData, has_id_document: Boolean(idFile) });

    // Validate required fields
    const requiredFields = [
      'customer_name', 'customer_email', 'booking_date',
      'start_time', 'duration_hours', 'attendees'
    ];

    for (const field of requiredFields) {
      if (!bookingData[field]) {
        console.error(`❌ Missing required field: ${field}`);
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // The duration now determines what the guest is charged, so validate it
    // here rather than trusting whatever the form posted.
    const durationHours = Number(bookingData.duration_hours);
    if (!Number.isFinite(durationHours) || durationHours <= 0 || durationHours > 12) {
      return NextResponse.json(
        { error: 'Invalid booking duration' },
        { status: 400 }
      );
    }
    bookingData.duration_hours = durationHours;

    const attendeesCount = Number(bookingData.attendees);
    if (!Number.isFinite(attendeesCount) || attendeesCount <= 0 || attendeesCount > 100) {
      return NextResponse.json(
        { error: 'Invalid attendee count' },
        { status: 400 }
      );
    }
    bookingData.attendees = attendeesCount;

    // Calculate end time
    const endTime = calculateEndTime(bookingData.start_time, bookingData.duration_hours);

    // ✅ CRITICAL: Check Google Calendar for conflicts FIRST
    console.log('🔍 Checking Google Calendar for conflicts...');
    const hasCalendarConflict = await googleCalendarAPI.checkCalendarConflict(
      bookingData.booking_date,
      bookingData.start_time,
      endTime
    );

    if (hasCalendarConflict) {
      return NextResponse.json(
        { error: 'Time slot conflicts with existing calendar events. Please choose a different time.' },
        { status: 409 }
      );
    }

    // **MEMBER BOOKING FLOW** — now requires portal login.
    // Free/included member bookings are handled by the authenticated
    // /api/bookings/member route so membership can be verified and the
    // monthly included-hours allotment enforced. This public endpoint no
    // longer issues free bookings to anyone self-selecting "member".
    if (bookingData.is_member_booking === true) {
      return NextResponse.json(
        {
          error: 'Please sign in to your member portal to book with your included hours.',
          requires_login: true,
        },
        { status: 401 }
      );
    }

    // **PAID BOOKING FLOW** - NO DATABASE, STORE IN STRIPE METADATA
    console.log('💳 Processing PAID booking (database-free)...');

    if (!bookingData.total_amount) {
      console.error('❌ Missing total_amount for paid booking');
      return NextResponse.json(
        { error: 'Total amount is required for paid bookings' },
        { status: 400 }
      );
    }

    // Non-members must attach a photo ID — the same photo_id requirement
    // members satisfy in the portal, with the same validation rules.
    if (!idFile) {
      return NextResponse.json(
        { error: 'A photo of your government-issued ID is required to book as a non-member.' },
        { status: 400 }
      );
    }
    // Same size + MIME allowlist the portal enforces on member uploads.
    let validatedId;
    try {
      validatedId = validateUpload(idFile);
    } catch (e: any) {
      if (e instanceof UploadValidationError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    // Generate booking ID
    const bookingId = `MH-PAID-${Date.now()}`;

    // Store the ID photo before holding the slot; if anything downstream
    // fails the file is removed again. Path prefix guest-bookings/ can never
    // collide with a member id, so the member self-read storage policies
    // don't expose it — only admins (service role) can view it.
    const sb = getServiceSupabase();
    const idDocumentPath = `guest-bookings/${bookingId}/photo_id-${Date.now()}.${validatedId.extension}`;
    const idBytes = new Uint8Array(await idFile.arrayBuffer());
    const { error: idUploadErr } = await sb.storage
      .from('member-documents')
      .upload(idDocumentPath, idBytes, { contentType: validatedId.contentType, upsert: false });
    if (idUploadErr) {
      console.error('❌ Guest ID upload failed:', idUploadErr);
      return NextResponse.json(
        { error: 'Failed to upload your ID. Please try again.' },
        { status: 500 }
      );
    }
    const removeIdDocument = async () => {
      const { error: rmErr } = await sb.storage.from('member-documents').remove([idDocumentPath]);
      if (rmErr) console.error('⚠️ Failed to clean up guest ID upload:', rmErr);
    };

    // Create booking object (no database save)
    const booking: SimpleBooking = {
      id: bookingId,
      room_id: null,
      customer_name: bookingData.customer_name,
      customer_email: bookingData.customer_email,
      customer_phone: bookingData.customer_phone || '',
      company: bookingData.company || '',
      booking_date: bookingData.booking_date,
      start_time: bookingData.start_time,
      end_time: endTime,
      duration_hours: bookingData.duration_hours,
      attendees: bookingData.attendees,
      purpose: bookingData.purpose || '',
      total_amount: bookingData.total_amount,
      status: 'pending',
      payment_status: 'pending',
      confirmation_sent: false,
      is_member_booking: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Paid booking created (in-memory):', booking.id);

    // ✅ IMMEDIATELY create Google Calendar event (will be cancelled if payment fails)
    console.log('📅 Creating Google Calendar event for PAID booking...');
    let calendarEventId = null;
    try {
      calendarEventId = await googleCalendarAPI.createBookingEvent(booking as any);
      if (calendarEventId) {
        console.log('✅ PAID BOOKING: Calendar event created:', calendarEventId);
      }
    } catch (calendarError) {
      console.error('⚠️ Calendar event creation failed:', calendarError);
      await removeIdDocument();
      return NextResponse.json(
        { 
          error: 'Failed to create calendar event. Please check your Google Calendar configuration.',
          details: calendarError instanceof Error ? calendarError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Create Stripe checkout session with booking data in metadata
    try {
      console.log('💳 Creating Stripe checkout session...');

      // The guest pays for the full reservation. The amount is derived inside
      // createConferenceCheckoutSession from the published hourly rate — the
      // client's `total_amount` is deliberately not used.
      const checkoutData = await createConferenceCheckoutSession(stripe, {
        bookingId: booking.id,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        customerPhone: booking.customer_phone,
        company: booking.company,
        roomName: 'Conference Room',
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        durationHours: booking.duration_hours,
        attendees: booking.attendees,
        billedHours: booking.duration_hours,
        purpose: booking.purpose,
        calendarEventId,
        idDocumentPath,
      });

      console.log('✅ Stripe checkout session created:', checkoutData.sessionId);

      return NextResponse.json({
        success: true,
        booking,
        checkout_url: checkoutData.url,
        session_id: checkoutData.sessionId,
        calendar_event_id: calendarEventId,
        message: 'Paid booking created. Calendar event created. Redirecting to payment...'
      });

    } catch (stripeError) {
      console.error('❌ Stripe session creation failed:', stripeError);

      // If calendar event was created, cancel it
      if (calendarEventId) {
        console.log('🗑️ Cancelling calendar event due to Stripe error...');
        await googleCalendarAPI.cancelBookingEvent(calendarEventId);
      }
      await removeIdDocument();

      const isInputError = stripeError instanceof ConferenceCheckoutError;
      return NextResponse.json({
        success: false,
        error: isInputError
          ? (stripeError as Error).message
          : 'Payment system unavailable. Please try again or contact support.',
        booking,
        fallback: true
      }, { status: isInputError ? 400 : 500 });
    }

  } catch (error) {
    console.error('❌ Booking creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create booking. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (date) {
      // Only get calendar events (no database)
      const calendarEvents = await googleCalendarAPI.getEventsForDate(date);
      
      return NextResponse.json({
        calendar_events: calendarEvents,
        source: 'google_calendar',
        note: 'All bookings are stored in Google Calendar only.'
      });
    }

    return NextResponse.json(
      { error: 'Date parameter required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// Helper function
function calculateEndTime(startTime: string, durationHours: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setHours(date.getHours() + durationHours);
  return date.toTimeString().slice(0, 5);
}