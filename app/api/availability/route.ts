// Replace app/api/availability/route.ts with this simplified version

import { NextRequest, NextResponse } from 'next/server';
import { meetingRoomAPI } from '@/lib/supabase';
import { googleCalendarAPI } from '@/lib/google-calendar';

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

    console.log('🏢 Getting availability for THE conference room on:', date);

    // Get all booked times from multiple sources
    const bookedTimes = new Set<string>();

    // 1. Check database bookings (paid bookings only)
    try {
      const { data: dbBookings, error } = await meetingRoomAPI.supabase
        .from('bookings')
        .select('start_time, end_time, duration_hours')
        .eq('booking_date', date)
        .in('status', ['confirmed', 'pending'])
        .neq('status', 'cancelled');

      if (!error && dbBookings) {
        dbBookings.forEach(booking => {
          const startHour = parseInt(booking.start_time.split(':')[0]);
          const durationHours = booking.duration_hours;
          
          // Mark all hours in the booking as unavailable
          for (let i = 0; i < durationHours; i++) {
            const hour = startHour + i;
            if (hour <= 18) {
              bookedTimes.add(`${hour.toString().padStart(2, '0')}:00`);
            }
          }
        });
        console.log('💳 Paid bookings found:', dbBookings.length);
      }
    } catch (dbError) {
      console.error('Database booking check failed:', dbError);
    }

    // 2. Check Google Calendar events (member bookings + all other events)
    try {
      const calendarEvents = await googleCalendarAPI.getEventsForDate(date);
      
      calendarEvents.forEach(event => {
        if (event.start?.dateTime && event.end?.dateTime) {
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          
          const startHour = start.getHours();
          const endHour = end.getHours();
          
          // Mark all affected hours as unavailable
          for (let hour = startHour; hour < endHour; hour++) {
            if (hour >= 8 && hour <= 18) {
              bookedTimes.add(`${hour.toString().padStart(2, '0')}:00`);
            }
          }
        }
      });
      console.log('📅 Calendar events (including member bookings):', calendarEvents.length);
    } catch (calendarError) {
      console.error('Calendar check failed:', calendarError);
    }

    // 3. Generate time slots for business hours (8 AM to 6 PM)
    const timeSlots = [];
    for (let hour = 8; hour <= 18; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      const isAvailable = !bookedTimes.has(timeSlot);
      
      timeSlots.push({
        time_slot: timeSlot,
        is_available: isAvailable
      });
    }

    console.log('🎯 THE Conference Room availability:', {
      total_slots: timeSlots.length,
      available_slots: timeSlots.filter(s => s.is_available).length,
      booked_times: Array.from(bookedTimes).sort()
    });

    return NextResponse.json({
      success: true,
      room_name: "Conference Room",
      date: date,
      time_slots: timeSlots,
      booked_times: Array.from(bookedTimes).sort(),
      total_slots: timeSlots.length,
      available_slots: timeSlots.filter(s => s.is_available).length,
      note: "This shows availability for THE conference room (member + paid bookings combined)"
    });

  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get availability',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}