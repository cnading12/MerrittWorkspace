// app/api/bookings/route.ts - UPDATED to use Google Calendar as source of truth
import { NextRequest, NextResponse } from 'next/server';
import { meetingRoomAPI, type Booking } from '@/lib/supabase';
import { googleCalendarAPI } from '@/lib/google-calendar';
import { sendMemberBookingConfirmationEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json();

    // Validate required fields
    const requiredFields = [
      'customer_name', 'customer_email', 'booking_date',
      'start_time', 'duration_hours', 'attendees'
    ];

    for (const field of requiredFields) {
      if (!bookingData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

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

    // **MEMBER BOOKING FLOW**
    if (bookingData.is_member_booking === true) {
      console.log('🎯 Processing MEMBER booking...');

      // Generate booking ID
      const bookingId = `MH-${Date.now()}`;

      // Create simplified booking object
      const simplifiedBooking = {
        id: bookingId,
        room_id: null as string | null,
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        booking_date: bookingData.booking_date,
        start_time: bookingData.start_time,
        end_time: endTime,
        duration_hours: bookingData.duration_hours,
        attendees: bookingData.attendees,
        purpose: bookingData.purpose || '',
        total_amount: 0,
        company: bookingData.company || '',
        customer_phone: bookingData.customer_phone || '',
        payment_status: 'completed' as const,
        status: 'confirmed' as const,
        confirmation_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_member_booking: true
      } as Booking;

      // ✅ IMMEDIATELY create Google Calendar event
      console.log('📅 Creating Google Calendar event for MEMBER booking...');
      let calendarEventId = null;
      try {
        calendarEventId = await googleCalendarAPI.createBookingEvent(simplifiedBooking);
        if (calendarEventId) {
          console.log('✅ MEMBER BOOKING: Calendar event created:', calendarEventId);
        } else {
          throw new Error('Calendar event creation returned null');
        }
      } catch (calendarError) {
        console.error('❌ CRITICAL: Failed to create calendar event:', calendarError);
        return NextResponse.json(
          { error: 'Failed to create calendar event. Please try again or contact support.' },
          { status: 500 }
        );
      }

      // Send confirmation emails
      console.log('📧 Sending confirmation emails...');
      try {
        await sendMemberBookingConfirmationEmail({
          to: bookingData.customer_email,
          customerName: bookingData.customer_name,
          booking: simplifiedBooking,
          roomName: 'Conference Room',
          isMemberBooking: true,
          memberHoursUsed: bookingData.duration_hours
        });
        console.log('✅ MEMBER BOOKING: Confirmation emails sent');
      } catch (emailError) {
        console.error('⚠️ Email sending failed:', emailError);
        // Don't fail the booking if emails fail
      }

      // Encode booking data for success page
      const bookingDataEncoded = Buffer.from(JSON.stringify({
        ...simplifiedBooking,
        calendar_event_created: true,
        calendar_event_id: calendarEventId
      })).toString('base64');

      return NextResponse.json({
        success: true,
        redirect_to: `/booking-success/member?data=${bookingDataEncoded}`,
        booking: {
          id: bookingId,
          customer_name: bookingData.customer_name,
          customer_email: bookingData.customer_email,
          booking_date: bookingData.booking_date,
          start_time: bookingData.start_time,
          end_time: endTime,
          duration_hours: bookingData.duration_hours,
          calendar_event_created: true,
          calendar_event_id: calendarEventId,
          is_member_booking: true,
          status: 'confirmed',
          payment_status: 'completed'
        },
        message: 'Member booking confirmed! Calendar event created successfully.'
      });
    }

    // **PAID BOOKING FLOW**
    console.log('💳 Processing PAID booking...');

    const paidRequiredFields = ['room_id', 'total_amount'];
    for (const field of paidRequiredFields) {
      if (!bookingData[field]) {
        return NextResponse.json(
          { error: `Missing required field for paid booking: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create booking in database with pending status
    const booking = await meetingRoomAPI.createBooking({
      ...bookingData,
      end_time: endTime,
      status: 'pending',
      payment_status: 'pending',
      confirmation_sent: false,
      is_member_booking: false
    });

    console.log('📝 Paid booking created in database:', booking.id);

    // ✅ IMMEDIATELY create Google Calendar event (will be cancelled if payment fails)
    console.log('📅 Creating Google Calendar event for PAID booking...');
    let calendarEventId = null;
    try {
      calendarEventId = await googleCalendarAPI.createBookingEvent(booking);
      if (calendarEventId) {
        // Update booking with calendar event ID
        await meetingRoomAPI.supabase
          .from('bookings')
          .update({ calendar_event_id: calendarEventId })
          .eq('id', booking.id);
        console.log('✅ PAID BOOKING: Calendar event created:', calendarEventId);
      }
    } catch (calendarError) {
      console.error('⚠️ Calendar event creation failed:', calendarError);
      // Continue with payment flow even if calendar fails
    }

    // Create Stripe checkout session
    try {
      const checkoutResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/create-meeting-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          customer_name: booking.customer_name,
          customer_email: booking.customer_email,
          room_name: 'Conference Room',
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          duration_hours: booking.duration_hours,
          attendees: booking.attendees,
          total_amount: booking.total_amount,
          purpose: booking.purpose
        })
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        throw new Error(errorData.error || 'Failed to create payment session');
      }

      const checkoutData = await checkoutResponse.json();

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
        await googleCalendarAPI.cancelBookingEvent(calendarEventId);
      }

      return NextResponse.json({
        success: false,
        error: 'Payment system unavailable. Please try again or contact support.',
        booking,
        fallback: true
      }, { status: 500 });
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
    const email = searchParams.get('email');
    const date = searchParams.get('date');

    if (email) {
      const bookings = await meetingRoomAPI.getBookingsByEmail(email);
      return NextResponse.json({
        bookings,
        note: 'Only shows paid bookings from database. Check Google Calendar for all bookings.'
      });
    }

    if (date) {
      // Get bookings from both database and calendar
      const dbBookings = await meetingRoomAPI.getBookingsForDate(date);
      const calendarEvents = await googleCalendarAPI.getEventsForDate(date);
      
      return NextResponse.json({
        database_bookings: dbBookings,
        calendar_events: calendarEvents,
        note: 'Shows both database bookings and calendar events. Calendar is the source of truth.'
      });
    }

    return NextResponse.json(
      { error: 'Email or date parameter required' },
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