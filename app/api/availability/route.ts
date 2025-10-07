// app/api/availability/route.ts - Uses Google Calendar as source of truth
import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarAPI } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'date parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Getting availability from Google Calendar for:', date);

    // ✅ Get available time slots directly from Google Calendar
    const timeSlots = await googleCalendarAPI.getAvailableTimeSlots(date);

    const availableSlots = timeSlots.filter(s => s.is_available).length;
    const bookedSlots = timeSlots.filter(s => !s.is_available);

    console.log('✅ Conference Room availability loaded:', {
      date,
      total_slots: timeSlots.length,
      available_slots: availableSlots,
      booked_slots: bookedSlots.length,
      booked_times: bookedSlots.map(s => s.time_slot)
    });

    return NextResponse.json({
      success: true,
      room_name: "Conference Room",
      date: date,
      time_slots: timeSlots,
      booked_times: bookedSlots.map(s => s.time_slot),
      total_slots: timeSlots.length,
      available_slots: availableSlots,
      source: "google_calendar",
      note: "Availability pulled directly from Google Calendar"
    });

  } catch (error) {
    console.error('❌ Availability API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get availability',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}