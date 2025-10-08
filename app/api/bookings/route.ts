// app/api/bookings/route.ts - FULLY DATABASE-FREE VERSION WITH BETTER ERROR HANDLING
import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarAPI } from '@/lib/google-calendar';
import { sendMemberBookingConfirmationEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

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
    const bookingData = await request.json();
    console.log('📥 Received booking data:', bookingData);

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
      const bookingId = `MH-MEMBER-${Date.now()}`;

      // Create simplified booking object
      const simplifiedBooking: SimpleBooking = {
        id: bookingId,
        room_id: null,
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
        payment_status: 'completed',
        status: 'confirmed',
        confirmation_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_member_booking: true
      };

      // ✅ IMMEDIATELY create Google Calendar event
      console.log('📅 Creating Google Calendar event for MEMBER booking...');
      let calendarEventId = null;
      try {
        calendarEventId = await googleCalendarAPI.createBookingEvent(simplifiedBooking as any);
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
          booking: simplifiedBooking as any,
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

    // **PAID BOOKING FLOW** - NO DATABASE, STORE IN STRIPE METADATA
    console.log('💳 Processing PAID booking (database-free)...');

    if (!bookingData.total_amount) {
      console.error('❌ Missing total_amount for paid booking');
      return NextResponse.json(
        { error: 'Total amount is required for paid bookings' },
        { status: 400 }
      );
    }

    // Generate booking ID
    const bookingId = `MH-PAID-${Date.now()}`;

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
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      const checkoutResponse = await fetch(`${baseUrl}/api/create-meeting-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          customer_name: booking.customer_name,
          customer_email: booking.customer_email,
          customer_phone: booking.customer_phone,
          company: booking.company,
          room_name: 'Conference Room',
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          duration_hours: booking.duration_hours,
          attendees: booking.attendees,
          total_amount: booking.total_amount,
          purpose: booking.purpose,
          calendar_event_id: calendarEventId
        })
      });

      console.log('Stripe checkout response status:', checkoutResponse.status);

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        console.error('❌ Stripe checkout error response:', errorData);
        
        // If calendar event was created, cancel it
        if (calendarEventId) {
          console.log('🗑️ Cancelling calendar event due to Stripe error...');
          await googleCalendarAPI.cancelBookingEvent(calendarEventId);
        }
        
        throw new Error(errorData.error || 'Failed to create payment session');
      }

      const checkoutData = await checkoutResponse.json();
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

      return NextResponse.json({
        success: false,
        error: stripeError instanceof Error ? stripeError.message : 'Payment system unavailable. Please try again or contact support.',
        details: stripeError instanceof Error ? stripeError.message : 'Unknown error',
        booking,
        fallback: true
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Booking creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create booking. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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