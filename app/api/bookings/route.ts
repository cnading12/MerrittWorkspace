// app/api/bookings/route.ts - UPDATED VERSION
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

    // **MEMBER BOOKING FLOW** - Simplified, no database storage BUT WITH CALENDAR
    if (bookingData.is_member_booking === true) {
      console.log('🎯 Processing MEMBER booking...');

      // Generate simple booking ID
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

      console.log('📅 CRITICAL: Creating Google Calendar event for MEMBER booking...');
      
      // 🔥 CRITICAL: Create Google Calendar event for manager visibility
      let calendarEventId = null;
      try {
        calendarEventId = await googleCalendarAPI.createBookingEvent(simplifiedBooking);
        if (calendarEventId) {
          console.log('✅ MEMBER BOOKING: Google Calendar event created successfully:', calendarEventId);
        } else {
          console.error('⚠️ MEMBER BOOKING: Failed to create calendar event - returned null');
        }
      } catch (calendarError) {
        console.error('❌ MEMBER BOOKING: Failed to create calendar event:', calendarError);
        console.warn('⚠️ MEMBER BOOKING: Continuing with booking despite calendar failure - MANAGERS WILL NOT SEE THIS BOOKING');
        
        // Log detailed error for debugging
        if (calendarError instanceof Error) {
          console.error('Calendar error details:', {
            message: calendarError.message,
            stack: calendarError.stack,
            booking: simplifiedBooking
          });
        }
      }

      console.log('📧 Sending confirmation emails...');
      
      // Send confirmation emails
      try {
        const emailResult = await sendMemberBookingConfirmationEmail({
          to: bookingData.customer_email,
          customerName: bookingData.customer_name,
          booking: simplifiedBooking,
          roomName: 'Conference Room', // Since there's only one room
          isMemberBooking: true,
          memberHoursUsed: bookingData.duration_hours
        });
        console.log('✅ MEMBER BOOKING: Confirmation emails sent:', emailResult);
      } catch (emailError) {
        console.error('❌ MEMBER BOOKING: Error sending emails:', emailError);
        // Don't fail the booking if emails fail
      }

      // 🔥 CRITICAL: Log calendar status for debugging
      console.log('🎯 MEMBER BOOKING SUMMARY:', {
        bookingId,
        customer: bookingData.customer_name,
        date: bookingData.booking_date,
        time: `${bookingData.start_time} - ${endTime}`,
        calendarEventCreated: !!calendarEventId,
        calendarEventId: calendarEventId || 'NONE - MANAGERS WILL NOT SEE THIS!'
      });

      // Return success response for member booking
      return NextResponse.json({
        success: true,
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
        calendar_status: {
          event_created: !!calendarEventId,
          event_id: calendarEventId || null,
          warning: !calendarEventId ? 'Calendar event creation failed - managers will not see this booking' : null
        },
        message: calendarEventId 
          ? 'Member booking confirmed! Confirmation emails sent and calendar event created.'
          : 'Member booking confirmed! Emails sent but calendar event failed - contact support.'
      });
    }

    // **PAID BOOKING FLOW** - Full database storage and Stripe integration
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

    // **NEW: Create Stripe checkout session immediately**
    try {
      const checkoutResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/create-meeting-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          customer_name: booking.customer_name,
          customer_email: booking.customer_email,
          room_name: 'Conference Room', // Update if you have multiple rooms
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
      
      // If Stripe fails, still return the booking but indicate payment system error
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const date = searchParams.get('date');

    if (email) {
      // Get bookings by email (only returns paid bookings from database)
      // Note: Member bookings are not stored in database
      const bookings = await meetingRoomAPI.getBookingsByEmail(email);
      return NextResponse.json({ 
        bookings,
        note: 'Only shows paid bookings. Member bookings are not stored in the database.'
      });
    }

    if (date) {
      // Get bookings for a specific date (admin view - only paid bookings)
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