// app/api/bookings/route.ts - UPDATED to redirect member bookings to success page

import { NextRequest, NextResponse } from 'next/server';
import { meetingRoomAPI } from '@/lib/supabase';
import { googleCalendarAPI } from '@/lib/google-calendar';
import { sendMemberBookingConfirmationEmail } from '@/lib/resend';

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

    // **MEMBER BOOKING FLOW** - Redirect to success page
    if (bookingData.is_member_booking === true) {
      console.log('🎯 Processing MEMBER booking...');

      // Generate booking ID that we can use for the success page
      const bookingId = `MH-${Date.now()}`;
      
      // Check for calendar conflicts only (no database check needed for members)
      const hasCalendarConflict = await googleCalendarAPI.checkCalendarConflict(
        bookingData.booking_date,
        bookingData.start_time,
        endTime
      );

      if (hasCalendarConflict) {
        return NextResponse.json(
          { error: 'Time slot conflicts with existing calendar events' },
          { status: 409 }
        );
      }

      // Create simplified booking object for emails/calendar
      const simplifiedBooking = {
        id: bookingId,
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        booking_date: bookingData.booking_date,
        start_time: bookingData.start_time,
        end_time: endTime,
        duration_hours: bookingData.duration_hours,
        attendees: bookingData.attendees,
        purpose: bookingData.purpose || '',
        total_amount: 0, // Free for members
        company: bookingData.company || '', 
        customer_phone: bookingData.customer_phone || '', 
        payment_status: 'paid', // Members don't pay
        status: 'confirmed'
      };

      console.log('📅 Creating Google Calendar event for MEMBER booking...');
      
      // Create Google Calendar event for manager visibility
      let calendarEventId = null;
      try {
        calendarEventId = await googleCalendarAPI.createBookingEvent(simplifiedBooking);
        if (calendarEventId) {
          console.log('✅ MEMBER BOOKING: Google Calendar event created successfully:', calendarEventId);
        }
      } catch (calendarError) {
        console.error('❌ MEMBER BOOKING: Failed to create calendar event:', calendarError);
        // Continue with booking despite calendar failure
      }

      console.log('📧 Sending confirmation emails...');
      
      // Send confirmation emails
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
        console.error('❌ MEMBER BOOKING: Error sending emails:', emailError);
        // Don't fail the booking if emails fail
      }

      // Store booking data temporarily in a way we can retrieve it
      // Since we're not using a database, we'll encode it in the redirect URL
      const bookingDataEncoded = Buffer.from(JSON.stringify({
        ...simplifiedBooking,
        calendar_event_created: !!calendarEventId,
        calendar_event_id: calendarEventId
      })).toString('base64');

      // Return redirect URL to member success page
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
          calendar_event_created: !!calendarEventId,
          calendar_event_id: calendarEventId,
          is_member_booking: true,
          status: 'confirmed',
          payment_status: 'paid'
        },
        message: 'Member booking confirmed! Redirecting to confirmation page...'
      });
    }

    // **PAID BOOKING FLOW** - Existing logic remains the same
    console.log('Processing paid booking...');
    
    const paidRequiredFields = ['room_id', 'total_amount'];
    for (const field of paidRequiredFields) {
      if (!bookingData[field]) {
        return NextResponse.json(
          { error: `Missing required field for paid booking: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check availability in database for paid bookings
    const isAvailable = await meetingRoomAPI.checkAvailability(
      bookingData.room_id,
      bookingData.booking_date,
      bookingData.start_time,
      endTime
    );

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Time slot is no longer available' },
        { status: 409 }
      );
    }

    // Check for calendar conflicts with Google Calendar
    const hasCalendarConflict = await googleCalendarAPI.checkCalendarConflict(
      bookingData.booking_date,
      bookingData.start_time,
      endTime
    );

    if (hasCalendarConflict) {
      return NextResponse.json(
        { error: 'Time slot conflicts with existing calendar events' },
        { status: 409 }
      );
    }

    // Create booking in database for paid bookings
    const booking = await meetingRoomAPI.createBooking({
      ...bookingData,
      end_time: endTime,
      status: 'pending',
      payment_status: 'pending',
      confirmation_sent: false,
      is_member_booking: false
    });

    console.log('Paid booking created in database:', booking.id);

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
        message: 'Paid booking created successfully. Redirecting to payment...'
      });

    } catch (stripeError) {
      console.error('Error creating Stripe session:', stripeError);
      
      return NextResponse.json({
        success: false,
        error: 'Payment system unavailable. Please try again or contact support.',
        booking,
        fallback: true
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking. Please try again.' },
      { status: 500 }
    );
  }
}

// ... rest of the existing code (GET method, helper functions)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const date = searchParams.get('date');

    if (email) {
      const bookings = await meetingRoomAPI.getBookingsByEmail(email);
      return NextResponse.json({ 
        bookings,
        note: 'Only shows paid bookings. Member bookings are not stored in the database.'
      });
    }

    if (date) {
      const bookings = await meetingRoomAPI.getBookingsForDate(date);
      return NextResponse.json({ 
        bookings,
        note: 'Only shows paid bookings. Check Google Calendar for member bookings.'
      });
    }

    return NextResponse.json(
      { error: 'Email or date parameter required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// Helper function to calculate end time
function calculateEndTime(startTime: string, durationHours: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setHours(date.getHours() + durationHours);
  return date.toTimeString().slice(0, 5);
}