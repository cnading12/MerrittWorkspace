// lib/google-calendar.ts - UPDATED to be the source of truth for availability
import { google } from 'googleapis';
import { type Booking } from './supabase';

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

export const googleCalendarAPI = {
  // ✅ PRIMARY FUNCTION: Get all events for a specific date
  async getEventsForDate(date: string): Promise<any[]> {
    try {
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.log('⚠️ Skipping calendar check during build');
        return [];
      }

      const auth = getGoogleAuth();

      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);

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
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          
          const startHour = start.getHours();
          const endHour = end.getHours();
          
          // Mark all hours in the event as booked
          for (let hour = startHour; hour < endHour; hour++) {
            bookedHours.add(hour);
          }
        }
      });

      // Generate time slots for business hours (8 AM to 6 PM)
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

      const bookingStart = new Date(`${date}T${startTime}`);
      const bookingEnd = new Date(`${date}T${endTime}`);

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

  // ✅ Create a calendar event for a booking
  async createBookingEvent(booking: Booking): Promise<string | null> {
    try {
      const auth = getGoogleAuth();

      // Combine date and time for proper datetime format
      const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}:00`);
      const endDateTime = new Date(`${booking.booking_date}T${booking.end_time}:00`);

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
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Denver',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Denver',
        },
        location: 'Merritt Workspace - 2246 Irving Street, Denver, CO 80211',
      };

      console.log('📅 Creating calendar event...');

      const response = await calendar.events.insert({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        requestBody: event,
        sendUpdates: 'none',
      });

      console.log('✅ Calendar event created successfully:', response.data.id);
      return response.data.id || null;

    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
      return null;
    }
  },

  // Update calendar event
  async updateBookingEvent(eventId: string, booking: Booking): Promise<boolean> {
    try {
      const auth = getGoogleAuth();

      const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
      const endDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);

      const event: CalendarEvent = {
        summary: `${booking.is_member_booking ? '[MEMBER]' : '[PAID]'} Meeting Room - ${booking.customer_name} (${booking.status.toUpperCase()})`,
        description: `
Meeting Room Booking Details:
- Customer: ${booking.customer_name}
- Email: ${booking.customer_email}
- Company: ${booking.company || 'N/A'}
- Phone: ${booking.customer_phone || 'N/A'}
- Attendees: ${booking.attendees}
- Purpose: ${booking.purpose || 'N/A'}
- Booking Type: ${booking.is_member_booking ? 'Member Booking (FREE)' : `Paid Booking ($${booking.total_amount})`}
- Status: ${booking.status.toUpperCase()}
- Payment Status: ${booking.payment_status.toUpperCase()}
- Booking ID: ${booking.id}

This is an automated booking from Merritt Workspace.
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Denver',
        },
        end: {
          dateTime: endDateTime.toISOString(),
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
    return new Date(`${date}T${time}`).toISOString();
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