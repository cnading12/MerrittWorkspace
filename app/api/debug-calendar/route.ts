import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarAPI } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'test';
    
    const results: any = {
      timestamp: new Date().toISOString(),
      environment_check: {
        google_calendar_id: process.env.GOOGLE_CALENDAR_ID ? 'SET' : 'MISSING',
        google_client_email: process.env.GOOGLE_CLIENT_EMAIL ? 'SET' : 'MISSING',
        google_private_key: process.env.GOOGLE_PRIVATE_KEY ? 'SET' : 'MISSING'
      }
    };

    if (action === 'test') {
      try {
        const testBooking = {
          id: 'test-' + Date.now(),
          customer_name: 'Test Customer',
          customer_email: 'test@example.com',
          booking_date: '2025-09-25',
          start_time: '15:00',
          end_time: '16:00',
          duration_hours: 1,
          attendees: 2,
          purpose: 'Calendar Test',
          total_amount: 25,
          company: 'Test Company',
          customer_phone: '555-0123'
        };

        const eventId = await googleCalendarAPI.createBookingEvent(testBooking);
        
        results.create_event = {
          success: !!eventId,
          event_id: eventId
        };

      } catch (error) {
        results.create_event = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}