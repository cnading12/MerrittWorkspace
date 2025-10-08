// lib/google-calendar.ts - FIXED TIMEZONE HANDLING
import { google } from 'googleapis';

// Initialize Google Calendar API
const getGoogleAuth = () => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Google Calendar API should not be called during build');
  }

  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google Calendar credentials');
  }

  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
  });

  return auth;
};

const calendar = google.calendar({ version: 'v3' });

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
}

export interface TimeSlot {
  time_slot: string;
  is_available: boolean;
}

// Flexible booking type to work with or without database
export interface FlexibleBooking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  company?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  attendees: number;
  purpose?: string;
  total_amount: number;
  is_member_booking?: boolean;
  status?: string;
  payment_status?: string;
}

export const googleCalendarAPI = {
  // ✅ PRIMARY FUNCTION: Get all events for a specific date
  async getEventsForDate(date: string): Promise<any[]> {
    try {
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.log('⚠️ Skipping calendar check during build');
        return [];
      }

      const auth = getGoogleAuth();

      // ✅ FIX: Create dates in Denver timezone
      const startOfDay = new Date(`${date}T00:00:00-07:00`); // Denver timezone
      const endOfDay = new Date(`${date}T23:59:59-07:00`);   // Denver timezone

      const response = await calendar.events.list({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      console.log(`📅 Found ${response.data.items?.length || 0} events for ${date}`);
      return response.data.items || [];
    } catch (error) {
      console.error('❌ Error fetching calendar events:', error);
      return [];
    }
  },

  // ✅ NEW: Get available time slots based on Google Calendar
  async getAvailableTimeSlots(date: string): Promise<TimeSlot[]> {
    try {
      console.log('🔍 Checking Google Calendar availability for:', date);

      // Get all events for the date from Google Calendar
      const calendarEvents = await this.getEventsForDate(date);

      // Create a set of booked hours
      const bookedHours = new Set<number>();

      calendarEvents.forEach(event => {
        if (event.start?.dateTime && event.end?.dateTime) {
          // ✅ FIX: Parse dates properly considering timezone
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          
          // Get hours in Denver timezone
          const startHour = parseInt(start.toLocaleString('en-US', { 
            hour: 'numeric', 
            hour12: false,
            timeZone: 'America/Denver' 
          }));
          const endHour = parseInt(end.toLocaleString('en-US', { 
            hour: 'numeric', 
            hour12: false,
            timeZone: 'America/Denver' 
          }));
          
          // Mark all hours in the event as booked
          for (let hour = startHour; hour < endHour; hour++) {
            bookedHours.add(hour);
          }
        }
      });

      // Generate time slots for business hours (8 AM to 6 PM Denver time)
      const timeSlots: TimeSlot[] = [];
      for (let hour = 8; hour <= 18; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        const isAvailable = !bookedHours.has(hour);
        
        timeSlots.push({
          time_slot: timeSlot,
          is_available: isAvailable
        });
      }

      console.log('✅ Generated time slots from calendar:', {
        total: timeSlots.length,
        available: timeSlots.filter(s => s.is_available).length,
        booked_hours: Array.from(bookedHours).sort()
      });

      return timeSlots;
    } catch (error) {
      console.error('❌ Error getting available time slots:', error);
      
      // Return default slots on error
      const fallbackSlots: TimeSlot[] = [];
      for (let hour = 8; hour <= 18; hour++) {
        fallbackSlots.push({
          time_slot: `${hour.toString().padStart(2, '0')}:00`,
          is_available: true
        });
      }
      return fallbackSlots;
    }
  },

  // ✅ Check if a specific time slot conflicts with calendar events
  async checkCalendarConflict(date: string, startTime: string, endTime: string): Promise<boolean> {
    try {
      const events = await this.getEventsForDate(date);

      // ✅ FIX: Create booking times in Denver timezone
      const bookingStart = new Date(`${date}T${startTime}:00-07:00`);
      const bookingEnd = new Date(`${date}T${endTime}:00-07:00`);

      for (const event of events) {
        if (!event.start?.dateTime || !event.end?.dateTime) continue;

        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);

        // Check for overlap
        if (
          (bookingStart >= eventStart && bookingStart < eventEnd) ||
          (bookingEnd > eventStart && bookingEnd <= eventEnd) ||
          (bookingStart <= eventStart && bookingEnd >= eventEnd)
        ) {
          console.log('⚠️ Calendar conflict found with event:', event.summary);
          return true; // Conflict found
        }
      }

      return false; // No conflict
    } catch (error) {
      console.error('❌ Error checking calendar conflicts:', error);
      return false; // Assume no conflict on error
    }
  },

  // ✅ Create a calendar event for a booking (FIXED TIMEZONE)
  async createBookingEvent(booking: FlexibleBooking): Promise<string | null> {
    try {
      const auth = getGoogleAuth();

      // ✅ FIX: Create datetime strings with Denver timezone offset
      // Format: YYYY-MM-DDTHH:MM:SS-07:00 (for Denver/Mountain Time)
      const startDateTime = `${booking.booking_date}T${booking.start_time}:00-07:00`;
      const endDateTime = `${booking.booking_date}T${booking.end_time}:00-07:00`;

      console.log('📅 Creating calendar event with times:', {
        start: startDateTime,
        end: endDateTime,
        timezone: 'America/Denver'
      });

      const event: CalendarEvent = {
        summary: `${booking.is_member_booking ? '[MEMBER]' : '[PAID]'} Meeting Room - ${booking.customer_name}`,
        description: `
Meeting Room Booking Details:
- Customer: ${booking.customer_name}
- Email: ${booking.customer_email}
- Company: ${booking.company || 'N/A'}
- Phone: ${booking.customer_phone || 'N/A'}
- Attendees: ${booking.attendees}
- Purpose: ${booking.purpose || 'N/A'}
- Booking Type: ${booking.is_member_booking ? 'Member Booking (FREE)' : `Paid Booking ($${booking.total_amount})`}
- Booking ID: ${booking.id}

This is an automated booking from Merritt Workspace.
        `.trim(),
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Denver',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Denver',
        },
        location: 'Merritt Workspace - 2246 Irving Street, Denver, CO 80211',
      };

      const response = await calendar.events.insert({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        requestBody: event,
        sendUpdates: 'none',
      });

      console.log('✅ Calendar event created successfully:', response.data.id);
      console.log('   Start time (Denver):', startDateTime);
      console.log('   End time (Denver):', endDateTime);
      
      return response.data.id || null;

    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
      return null;
    }
  },

  // Update calendar event (FIXED TIMEZONE)
  async updateBookingEvent(eventId: string, booking: FlexibleBooking): Promise<boolean> {
    try {
      const auth = getGoogleAuth();

      // ✅ FIX: Use Denver timezone
      const startDateTime = `${booking.booking_date}T${booking.start_time}:00-07:00`;
      const endDateTime = `${booking.booking_date}T${booking.end_time}:00-07:00`;

      const event: CalendarEvent = {
        summary: `${booking.is_member_booking ? '[MEMBER]' : '[PAID]'} Meeting Room - ${booking.customer_name} (${booking.status?.toUpperCase() || 'CONFIRMED'})`,
        description: `
Meeting Room Booking Details:
- Customer: ${booking.customer_name}
- Email: ${booking.customer_email}
- Company: ${booking.company || 'N/A'}
- Phone: ${booking.customer_phone || 'N/A'}
- Attendees: ${booking.attendees}
- Purpose: ${booking.purpose || 'N/A'}
- Booking Type: ${booking.is_member_booking ? 'Member Booking (FREE)' : `Paid Booking ($${booking.total_amount})`}
- Status: ${booking.status?.toUpperCase() || 'CONFIRMED'}
- Payment Status: ${booking.payment_status?.toUpperCase() || 'PAID'}
- Booking ID: ${booking.id}

This is an automated booking from Merritt Workspace.
        `.trim(),
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Denver',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Denver',
        },
        location: 'Merritt Workspace - 2246 Irving Street, Denver, CO 80211',
      };

      await calendar.events.update({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId,
        requestBody: event,
        sendUpdates: 'none',
      });

      console.log('✅ Calendar event updated:', eventId);
      return true;
    } catch (error) {
      console.error('❌ Error updating calendar event:', error);
      return false;
    }
  },

  // Cancel calendar event
  async cancelBookingEvent(eventId: string): Promise<boolean> {
    try {
      const auth = getGoogleAuth();

      await calendar.events.delete({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId,
        sendUpdates: 'none',
      });

      console.log('✅ Calendar event cancelled:', eventId);
      return true;
    } catch (error) {
      console.error('❌ Error cancelling calendar event:', error);
      return false;
    }
  },
};

// Utility functions
export const calendarUtils = {
  formatDateTime: (date: string, time: string): string => {
    // Return in Denver timezone format
    return `${date}T${time}:00-07:00`;
  },

  formatDateTimeForDisplay: (dateTime: string): string => {
    return new Date(dateTime).toLocaleString('en-US', {
      timeZone: 'America/Denver',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  },

  getDenverTimeZone: () => 'America/Denver',
};