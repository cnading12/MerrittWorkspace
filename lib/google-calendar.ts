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
  location?: string;
}

export const googleCalendarAPI = {
  // Create a calendar event for a booking (NO ATTENDEES - emails handle notifications)
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
Customer notifications are handled via email separately.
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Denver',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Denver',
        },
        location: '2246 Irving Street, Denver, CO 80211',
      };

      console.log('📅 Creating calendar event (no attendees)...');
      
      // Create event WITHOUT attendees - no Domain-Wide Delegation needed!
      const response = await calendar.events.insert({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        requestBody: event,
        sendUpdates: 'none', // No automatic invitations
      });

      console.log('✅ Calendar event created successfully:', response.data.id);
      return response.data.id || null;
      
    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
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
Customer notifications are handled via email separately.
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Denver',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Denver',
        },
        location: '2246 Irving Street, Denver, CO 80211',
      };

      await calendar.events.update({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId,
        requestBody: event,
        sendUpdates: 'none', // No automatic notifications
      });

      console.log('✅ Calendar event updated:', eventId);
      return true;
    } catch (error) {
      console.error('❌ Error updating calendar event:', error);
      return false;
    }
  },

  // Cancel/delete a calendar event
  async cancelBookingEvent(eventId: string): Promise<boolean> {
    try {
      const auth = getGoogleAuth();
      
      await calendar.events.delete({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId,
        sendUpdates: 'none', // No automatic cancellation notifications
      });

      console.log('✅ Calendar event cancelled:', eventId);
      return true;
    } catch (error) {
      console.error('❌ Error cancelling calendar event:', error);
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
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('❌ Error fetching calendar events:', error);
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
      console.error('❌ Error checking calendar conflicts:', error);
      return false; // Assume no conflict on error
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

// Add this test function to your lib/google-calendar.ts temporarily

export const testDomainWideDelegation = async () => {
  try {
    console.log('🔍 Testing Domain-Wide Delegation...');
    
    const auth = getGoogleAuth();
    
    // Test 1: Can we access the calendar?
    console.log('📅 Testing calendar access...');
    const calendarResponse = await calendar.calendars.get({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    });
    console.log('✅ Calendar access successful:', calendarResponse.data.summary);
    
    // Test 2: Can we create a basic event?
    console.log('📝 Testing event creation (no attendees)...');
    const basicEvent = await calendar.events.insert({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      requestBody: {
        summary: 'Domain-Wide Delegation Test',
        start: {
          dateTime: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
          timeZone: 'America/Denver',
        },
        end: {
          dateTime: new Date(Date.now() + 120000).toISOString(), // 2 minutes from now
          timeZone: 'America/Denver',
        },
      },
      sendUpdates: 'none',
    });
    console.log('✅ Basic event created:', basicEvent.data.id);
    
    // Test 3: Can we add attendees (this requires Domain-Wide Delegation)?
    console.log('👥 Testing attendee addition...');
    const eventWithAttendees = await calendar.events.patch({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: basicEvent.data.id!,
      requestBody: {
        attendees: [
          {
            email: 'test@merrittworkspace.net',
            displayName: 'Test User',
          }
        ]
      },
      sendUpdates: 'all',
    });
    console.log('✅ Domain-Wide Delegation working! Attendees added successfully');
    
    // Clean up test event
    await calendar.events.delete({
      auth,
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: basicEvent.data.id!,
    });
    console.log('🧹 Test event cleaned up');
    
    return {
      success: true,
      message: 'Domain-Wide Delegation is working correctly!'
    };
    
  } catch (error: any) {
    console.error('❌ Domain-Wide Delegation test failed:', error);
    
    if (error.message?.includes('forbidden')) {
      return {
        success: false,
        message: 'Domain-Wide Delegation not properly configured. Check Google Workspace Admin Console.',
        details: error.message
      };
    }
    
    if (error.message?.includes('Service accounts cannot invite attendees')) {
      return {
        success: false,
        message: 'Domain-Wide Delegation missing. Service account needs delegation authority.',
        details: error.message
      };
    }
    
    return {
      success: false,
      message: 'Unknown error occurred',
      details: error.message
    };
  }
};

// Also update your main createBookingEvent function to be more robust:
export const createBookingEventRobust = async (booking: Booking): Promise<string | null> => {
  try {
    const auth = getGoogleAuth();
    
    // Combine date and time for proper datetime format
    const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const endDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);
    
    const baseEvent = {
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
        timeZone: 'America/Denver',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Denver',
      },
      location: '2246 Irving Street, Denver, CO 80211',
    };

    console.log('🔄 Attempting to create calendar event...');
    console.log('📧 Using calendar ID:', process.env.GOOGLE_CALENDAR_ID || 'primary');

    // Strategy 1: Try with attendees first (if Domain-Wide Delegation is working)
    try {
      console.log('👥 Attempting with attendees (Domain-Wide Delegation)...');
      const eventWithAttendees = await calendar.events.insert({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        requestBody: {
          ...baseEvent,
          attendees: [
            {
              email: booking.customer_email,
              displayName: booking.customer_name,
            },
            {
              email: process.env.WORKSPACE_EMAIL || 'manager@merrittworkspace.net',
              displayName: 'Merritt Workspace',
            }
          ]
        },
        sendUpdates: 'all',
      });
      
      console.log('✅ Event created with attendees successfully!');
      return eventWithAttendees.data.id || null;
      
    } catch (attendeeError: any) {
      console.log('⚠️ Failed to create with attendees, trying without...');
      
      // Strategy 2: Create without attendees
      const basicEvent = await calendar.events.insert({
        auth,
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        requestBody: baseEvent,
        sendUpdates: 'none',
      });

      console.log('✅ Event created without attendees');
      
      // Strategy 3: Try to add attendees after creation
      if (basicEvent.data.id) {
        try {
          console.log('🔄 Attempting to add attendees post-creation...');
          await calendar.events.patch({
            auth,
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            eventId: basicEvent.data.id,
            requestBody: {
              attendees: [
                {
                  email: booking.customer_email,
                  displayName: booking.customer_name,
                },
                {
                  email: process.env.WORKSPACE_EMAIL || 'manager@merrittworkspace.net',
                  displayName: 'Merritt Workspace',
                }
              ]
            },
            sendUpdates: 'all',
          });
          console.log('✅ Attendees added successfully after creation!');
        } catch (patchError) {
          console.log('⚠️ Could not add attendees after creation, but event exists');
        }
      }

      return basicEvent.data.id || null;
    }

  } catch (error) {
    console.error('❌ Failed to create calendar event:', error);
    return null;
  }
};