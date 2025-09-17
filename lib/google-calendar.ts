import { google } from 'googleapis';
import { type Booking } from './supabase';

// Initialize Google Calendar API
const getGoogleAuth = () => {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
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
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  location?: string;
}

export const googleCalendarAPI = {
  // Create a calendar event for a booking
  async createBookingEvent(booking: Booking): Promise<string | null> {
    try {
      const auth = getGoogleAuth();
      
      // Combine date and time for proper datetime format
      const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
      const endDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);
      
      const event: CalendarEvent = {
        summary: `Meeting Room Booking - ${booking.customer_name}`,
        description: `
Meeting Room Booking Details:
- Customer: ${booking.customer_name}
- Email: ${booking.customer_email}
- Company: ${booking.company || 'N/A'}
- Phone: ${booking.customer_phone || 'N/A'}
- Attendees: ${booking.attendees}
- Purpose: ${booking.purpose || 'N/A'}
- Booking ID: ${booking.id}
- Total Amount: $${booking.total_amount}

This is an automated booking from Merritt Workspace.
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Denver', // Denver timezone
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Denver',
        },
        attendees: [
          {
            email: booking.customer_email,
            displayName: booking.customer_name,
          },
          {
            email: process.env.WORKSPACE_EMAIL || 'manager@merrittworkspace.net',
            displayName: 'Merritt Workspace',
          }
        ],
        location: '2246 Irving Street, Denver, CO 80211',
      };

      const response = await calendar.events.insert({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'manager@merrittworkspace.net',
        requestBody: event,
        sendUpdates: 'all', // Send email invitations to attendees
      });

      console.log('Calendar event created:', response.data.id);
      return response.data.id || null;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  },

  // Update an existing calendar event
  async updateBookingEvent(eventId: string, booking: Booking): Promise<boolean> {
    try {
      const auth = getGoogleAuth();
      
      const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
      const endDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);
      
      const event: CalendarEvent = {
        summary: `Meeting Room Booking - ${booking.customer_name} (${booking.status.toUpperCase()})`,
        description: `
Meeting Room Booking Details:
- Customer: ${booking.customer_name}
- Email: ${booking.customer_email}
- Company: ${booking.company || 'N/A'}
- Phone: ${booking.customer_phone || 'N/A'}
- Attendees: ${booking.attendees}
- Purpose: ${booking.purpose || 'N/A'}
- Booking ID: ${booking.id}
- Total Amount: $${booking.total_amount}
- Status: ${booking.status.toUpperCase()}
- Payment Status: ${booking.payment_status.toUpperCase()}

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
        attendees: [
          {
            email: booking.customer_email,
            displayName: booking.customer_name,
          },
          {
            email: process.env.WORKSPACE_EMAIL || 'manager@merrittworkspace.net',
            displayName: 'Merritt Workspace',
          }
        ],
        location: '2246 Irving Street, Denver, CO 80211',
      };

      await calendar.events.update({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'manager@merrittworkspace.net',
        eventId,
        requestBody: event,
        sendUpdates: 'all',
      });

      console.log('Calendar event updated:', eventId);
      return true;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return false;
    }
  },

  // Cancel/delete a calendar event
  async cancelBookingEvent(eventId: string): Promise<boolean> {
    try {
      const auth = getGoogleAuth();
      
      await calendar.events.delete({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'manager@merrittworkspace.net',
        eventId,
        sendUpdates: 'all', // Notify attendees of cancellation
      });

      console.log('Calendar event cancelled:', eventId);
      return true;
    } catch (error) {
      console.error('Error cancelling calendar event:', error);
      return false;
    }
  },

  // Get events for a specific date (to check actual calendar conflicts)
  async getEventsForDate(date: string): Promise<any[]> {
    try {
      const auth = getGoogleAuth();
      
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);
      
      const response = await calendar.events.list({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'manager@merrittworkspace.net',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  },

  // Check if a time slot conflicts with existing calendar events
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
          return true; // Conflict found
        }
      }
      
      return false; // No conflict
    } catch (error) {
      console.error('Error checking calendar conflicts:', error);
      return false; // Assume no conflict on error
    }
  },

  // Sync booking status with calendar event
  async syncBookingStatus(booking: Booking): Promise<void> {
    try {
      if (!booking.calendar_event_id) {
        // Create new calendar event if none exists
        if (booking.status === 'confirmed' && booking.payment_status === 'paid') {
          const eventId = await this.createBookingEvent(booking);
          if (eventId) {
            // Update booking with calendar event ID
            // This would be called from the main API
            console.log('Calendar event created for booking:', booking.id);
          }
        }
      } else {
        // Update existing calendar event
        if (booking.status === 'cancelled') {
          await this.cancelBookingEvent(booking.calendar_event_id);
        } else {
          await this.updateBookingEvent(booking.calendar_event_id, booking);
        }
      }
    } catch (error) {
      console.error('Error syncing booking status with calendar:', error);
    }
  }
};

// Utility functions for calendar integration
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