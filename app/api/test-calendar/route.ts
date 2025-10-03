import { NextResponse } from 'next/server';
import { googleCalendarAPI } from '@/lib/google-calendar';
import { meetingRoomAPI } from '@/lib/supabase';

// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🧪 Testing Google Calendar and Database Sync...');
    
    // Test 1: Check Google Calendar
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Checking calendar for date:', today);
    
    const events = await googleCalendarAPI.getEventsForDate(today);
    console.log('📅 Calendar events found:', events.length);
    
    // Test 2: Check Database Bookings
    console.log('💾 Checking database bookings for date:', today);
    const bookings = await meetingRoomAPI.getBookingsForDate(today);
    console.log('💾 Database bookings found:', bookings.length);
    
    // Test 3: Check last 5 bookings regardless of date
    console.log('📋 Fetching recent bookings...');
    const allBookings = await meetingRoomAPI.getAllBookings();
    const recentBookings = allBookings.slice(0, 5);
    console.log('📋 Recent bookings:', recentBookings.length);
    
    return NextResponse.json({
      success: true,
      today: today,
      calendar: {
        eventsFound: events.length,
        events: events.map(e => ({
          summary: e.summary,
          start: e.start?.dateTime,
          end: e.end?.dateTime,
          id: e.id
        }))
      },
      database: {
        bookingsToday: bookings.length,
        todayBookings: bookings.map(b => ({
          id: b.id,
          customer: b.customer_name,
          date: b.booking_date,
          time: `${b.start_time} - ${b.end_time}`,
          status: b.status,
          calendarEventId: b.calendar_event_id || 'NO CALENDAR EVENT',
          isMember: b.is_member_booking
        })),
        recentBookings: recentBookings.map(b => ({
          id: b.id,
          customer: b.customer_name,
          date: b.booking_date,
          time: `${b.start_time} - ${b.end_time}`,
          status: b.status,
          calendarEventId: b.calendar_event_id || 'NO CALENDAR EVENT',
          isMember: b.is_member_booking,
          createdAt: b.created_at
        }))
      },
      config: {
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY
      }
    });
  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}