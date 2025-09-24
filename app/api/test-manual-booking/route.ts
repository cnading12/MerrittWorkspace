import { NextRequest, NextResponse } from 'next/server';
import { meetingRoomAPI } from '@/lib/supabase';
import { googleCalendarAPI } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  try {
    const { booking_type } = await request.json();

    console.log('🧪 MANUAL TEST: Testing member booking calendar creation...');
    
    const testMemberBooking = {
      id: `manual-test-${Date.now()}`,
      customer_name: 'Manual Test Member',
      customer_email: 'test@merrittworkspace.net',
      booking_date: '2025-09-25',
      start_time: '14:00',
      end_time: '15:00',
      duration_hours: 1,
      attendees: 3,
      purpose: 'Manual Member Booking Test',
      total_amount: 0,
      company: 'Test Company',
      customer_phone: '555-0123',
      payment_status: 'paid',
      status: 'confirmed'
    };

    console.log('📅 MANUAL TEST: Creating calendar event...');
    
    let calendarEventId = null;
    try {
      calendarEventId = await googleCalendarAPI.createBookingEvent(testMemberBooking);
      console.log('Calendar event result:', calendarEventId);
    } catch (calendarError) {
      console.error('Calendar creation failed:', calendarError);
    }

    return NextResponse.json({
      success: true,
      calendar_event_created: !!calendarEventId,
      calendar_event_id: calendarEventId,
      message: 'Check your Google Calendar now!'
    });

  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}