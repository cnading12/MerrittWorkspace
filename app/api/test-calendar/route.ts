import { NextResponse } from 'next/server';
import { googleCalendarAPI } from '@/lib/google-calendar';

export async function GET() {
  try {
    console.log('🧪 Testing Google Calendar API...');
    console.log('📧 Client Email:', process.env.GOOGLE_CLIENT_EMAIL);
    console.log('📅 Calendar ID:', process.env.GOOGLE_CALENDAR_ID);
    console.log('🔑 Has Private Key:', !!process.env.GOOGLE_PRIVATE_KEY);
    
    // Test getting events for today
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Fetching events for:', today);
    
    const events = await googleCalendarAPI.getEventsForDate(today);
    
    console.log('✅ Calendar API Success! Found', events.length, 'events');
    
    return NextResponse.json({
      success: true,
      message: 'Google Calendar API is working!',
      date: today,
      eventsFound: events.length,
      events: events.map(e => ({
        summary: e.summary,
        start: e.start?.dateTime,
        end: e.end?.dateTime
      })),
      config: {
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'not set',
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL || 'not set',
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ Calendar test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error instanceof Error ? error.stack : undefined,
      config: {
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'not set',
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL || 'not set',
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0
      }
    }, { status: 500 });
  }
}