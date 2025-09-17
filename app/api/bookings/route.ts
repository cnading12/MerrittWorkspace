import { NextRequest, NextResponse } from 'next/server';
import { meetingRoomAPI } from '@/lib/supabase';
import { googleCalendarAPI } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'room_id', 'customer_name', 'customer_email', 'booking_date', 
      'start_time', 'end_time', 'duration_hours', 'total_amount'
    ];
    
    for (const field of requiredFields) {
      if (!bookingData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check availability one more time before creating booking
    const isAvailable = await meetingRoomAPI.checkAvailability(
      bookingData.room_id,
      bookingData.booking_date,
      bookingData.start_time,
      bookingData.end_time
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
      bookingData.end_time
    );

    if (hasCalendarConflict) {
      return NextResponse.json(
        { error: 'Time slot conflicts with existing calendar events' },
        { status: 409 }
      );
    }

    // Create booking in database
    const booking = await meetingRoomAPI.createBooking({
      ...bookingData,
      status: 'pending',
      payment_status: 'pending',
      confirmation_sent: false
    });

    // Return booking data for Stripe checkout
    return NextResponse.json({
      success: true,
      booking,
      message: 'Booking created successfully'
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
      // Get bookings by email
      const bookings = await meetingRoomAPI.getBookingsByEmail(email);
      return NextResponse.json({ bookings });
    }

    if (date) {
      // Get bookings for a specific date (admin view)
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