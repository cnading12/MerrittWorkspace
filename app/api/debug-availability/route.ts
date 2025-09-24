// Create this as app/api/debug-availability/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { meetingRoomAPI } from '@/lib/supabase';
import { googleCalendarAPI } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('room_id') || 'test-room-id';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    console.log('🔍 Debugging availability for:', { roomId, date });

    // Check 1: Do we have rooms in the database?
    console.log('📋 Checking rooms in database...');
    const rooms = await meetingRoomAPI.getRooms();
    console.log('Rooms found:', rooms.length, rooms.map(r => ({ id: r.id, name: r.name })));

    // Check 2: Do we have any bookings for this date?
    console.log('📅 Checking bookings for date...');
    const { data: bookings, error: bookingsError } = await meetingRoomAPI.supabase
      .from('bookings')
      .select('*')
      .eq('booking_date', date)
      .neq('status', 'cancelled');

    console.log('Bookings found:', bookings?.length || 0, bookings);
    if (bookingsError) console.error('Bookings error:', bookingsError);

    // Check 3: Test the availability function
    console.log('🔧 Testing get_available_slots function...');
    let slotsResult = null;
    let slotsError = null;
    
    try {
      const { data, error } = await meetingRoomAPI.supabase
        .rpc('get_available_slots', {
          p_room_id: roomId,
          p_date: date
        });
      slotsResult = data;
      slotsError = error;
    } catch (err) {
      slotsError = err;
    }

    console.log('Slots function result:', slotsResult);
    console.log('Slots function error:', slotsError);

    // Check 4: Test calendar conflicts
    console.log('📆 Checking Google Calendar conflicts...');
    const calendarEvents = await googleCalendarAPI.getEventsForDate(date);
    console.log('Calendar events found:', calendarEvents.length);

    // Check 5: Manual availability check for 2:00 PM
    console.log('🕐 Testing specific time availability...');
    let manualCheck = null;
    let manualError = null;
    
    if (rooms.length > 0) {
      try {
        manualCheck = await meetingRoomAPI.checkAvailability(
          rooms[0].id,
          date,
          '14:00',
          '15:00'
        );
      } catch (err) {
        manualError = err;
      }
    }

    // Generate what slots SHOULD look like manually
    console.log('🔨 Generating manual slots...');
    const manualSlots = [];
    const bookedTimes = new Set();
    
    // Add database booking times
    bookings?.forEach(booking => {
      const startHour = parseInt(booking.start_time.split(':')[0]);
      const endHour = parseInt(booking.end_time.split(':')[0]);
      for (let hour = startHour; hour < endHour; hour++) {
        bookedTimes.add(`${hour.toString().padStart(2, '0')}:00`);
      }
    });

    // Add calendar event times
    calendarEvents.forEach(event => {
      if (event.start?.dateTime && event.end?.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        const startHour = start.getHours();
        const endHour = end.getHours();
        for (let hour = startHour; hour < endHour; hour++) {
          bookedTimes.add(`${hour.toString().padStart(2, '0')}:00`);
        }
      }
    });

    // Generate time slots 8 AM to 6 PM
    for (let hour = 8; hour <= 18; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      manualSlots.push({
        time_slot: timeSlot,
        is_available: !bookedTimes.has(timeSlot)
      });
    }

    return NextResponse.json({
      debug_info: {
        roomId,
        date,
        rooms_count: rooms.length,
        database_bookings: bookings?.length || 0,
        calendar_events: calendarEvents.length,
        function_exists: !slotsError?.message?.includes('does not exist'),
        manual_2pm_available: manualCheck,
        booked_times: Array.from(bookedTimes)
      },
      database_bookings: bookings,
      calendar_events: calendarEvents.map(e => ({
        summary: e.summary,
        start: e.start?.dateTime,
        end: e.end?.dateTime
      })),
      function_result: slotsResult,
      function_error: slotsError?.message,
      manual_check_2pm: manualCheck,
      manual_check_error: manualError?.message,
      suggested_slots: manualSlots
    });

  } catch (error) {
    console.error('Debug availability error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}