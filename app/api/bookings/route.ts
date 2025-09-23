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

    // **SIMPLIFIED MEMBER BOOKING FLOW** - No database, just email & calendar
    if (bookingData.is_member_booking === true) {

      // Generate simple booking ID
      const bookingId = `MH-${Date.now()}`;
      
      // Check for calendar conflicts only
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
        company: '', 
        customer_phone: '', 
        payment_status: 'paid', // Members don't pay
        status: 'confirmed'
      };

      // Create Google Calendar event
      const calendarEventId = await googleCalendarAPI.createBookingEvent(simplifiedBooking);
      
      if (!calendarEventId) {
        console.warn('Failed to create calendar event, but continuing with booking');
      }

      // Send confirmation emails
      await sendMemberBookingConfirmationEmail({
        to: bookingData.customer_email,
        customerName: bookingData.customer_name,
        booking: simplifiedBooking,
        roomName: 'Conference Room', // Since there's only one room
        isMemberBooking: true,
        memberHoursUsed: bookingData.duration_hours
      });

      // Return success response for member booking
      return NextResponse.json({
        success: true,
        booking: {
          id: bookingId,
          customer_name: bookingData.customer_name,
          booking_date: bookingData.booking_date,
          start_time: bookingData.start_time,
          end_time: endTime,
          duration_hours: bookingData.duration_hours,
          calendar_event_created: !!calendarEventId,
          is_member_booking: true
        },
        message: 'Member booking confirmed! Confirmation emails sent and calendar event created.'
      });
    }

    // **EXISTING PAID BOOKING FLOW** - Continue with database storage for paid bookings
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

    // Return booking data for Stripe checkout
    return NextResponse.json({
      success: true,
      booking,
      message: 'Paid booking created successfully'
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
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
      const bookings = await meetingRoomAPI.getBookingsByEmail(email);
      return NextResponse.json({ bookings });
    }

    if (date) {
      // Get bookings for a specific date (admin view - only paid bookings)
      const bookings = await meetingRoomAPI.getBookingsForDate(date);
      return NextResponse.json({ bookings });
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