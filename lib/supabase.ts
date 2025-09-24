// lib/supabase.ts - UPDATED VERSION with fixed updateBookingPayment
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  hourly_rate: number;
  amenities: string[];
  description: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  room_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  company?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_amount: number;
  attendees: number;
  purpose?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  confirmation_sent: boolean;
  calendar_event_id?: string;
  is_member_booking?: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlockedTime {
  id: string;
  room_id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_by?: string;
  created_at: string;
}

export interface TimeSlot {
  time_slot: string;
  is_available: boolean;
}

// API Functions
export const meetingRoomAPI = {
  // Expose supabase client for direct access when needed
  supabase,

  // Test database connection
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('meeting_rooms')
        .select('count')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  },

  // Get all active meeting rooms
  async getRooms(): Promise<MeetingRoom[]> {
    const { data, error } = await supabase
      .from('meeting_rooms')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching rooms:', error);
      throw new Error(`Failed to fetch meeting rooms: ${error.message}`);
    }

    return data || [];
  },

  // Get room by ID
  async getRoom(id: string): Promise<MeetingRoom | null> {
    const { data, error } = await supabase
      .from('meeting_rooms')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching room:', error);
      throw new Error(`Failed to fetch room: ${error.message}`);
    }

    return data;
  },

  // Get available time slots for a specific date
  async getAvailableSlots(roomId: string, date: string): Promise<TimeSlot[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_available_slots', {
          p_room_id: roomId,
          p_date: date
        });

      if (error) {
        console.error('Error calling get_available_slots function:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('Error getting available slots:', error);

      // If the function doesn't exist, provide a helpful error message
      if (error.message && error.message.includes('function') && error.message.includes('does not exist')) {
        throw new Error('Database functions are not set up. Please run the database setup script first.');
      }

      throw new Error(`Failed to get available slots: ${error.message}`);
    }
  },

  // Check if a specific time slot is available
  async checkAvailability(
    roomId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('check_room_availability', {
          p_room_id: roomId,
          p_date: date,
          p_start_time: startTime,
          p_end_time: endTime
        });

      if (error) {
        console.error('Error calling check_room_availability function:', error);
        throw error;
      }

      return data === true;
    } catch (error: any) {
      console.error('Error checking availability:', error);

      // If the function doesn't exist, provide a helpful error message
      if (error.message && error.message.includes('function') && error.message.includes('does not exist')) {
        throw new Error('Database functions are not set up. Please run the database setup script first.');
      }

      throw new Error(`Failed to check availability: ${error.message}`);
    }
  },

  // Create a new booking
  async createBooking(booking: Partial<Booking>): Promise<Booking> {
    console.log('Creating booking with data:', booking);

    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select()
      .single();

    if (error) {
      console.error('Error creating booking:', error);
      throw new Error(`Failed to create booking: ${error.message}`);
    }

    console.log('Booking created successfully:', data);
    return data;
  },

  // Get booking by ID
  async getBooking(id: string): Promise<Booking | null> {
    console.log('Fetching booking with ID:', id);

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching booking:', error);
      if (error.code === 'PGRST116') {
        console.error('Booking not found with ID:', id);
        return null;
      }
      throw new Error(`Failed to fetch booking: ${error.message}`);
    }

    console.log('Booking fetched successfully:', data);
    return data;
  },

  // Update booking status
  async updateBookingStatus(
    id: string,
    status: Booking['status'],
    paymentStatus?: Booking['payment_status']
  ): Promise<Booking> {
    console.log('Updating booking status:', { id, status, paymentStatus });

    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (paymentStatus) updateData.payment_status = paymentStatus;

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating booking status:', error);
      if (error.code === 'PGRST116') {
        throw new Error(`Booking not found with ID: ${id}`);
      }
      throw new Error(`Failed to update booking status: ${error.message}`);
    }

    console.log('Booking status updated successfully:', data);
    return data;
  },

  // FIXED: Update booking with Stripe information
  // REPLACE the updateBookingPayment function in lib/supabase.ts with this FIXED version

  // FIXED: Update booking with Stripe information
  async updateBookingPayment(
    id: string,
    stripeSessionId?: string,
    stripePaymentIntentId?: string
  ): Promise<Booking> {
    console.log('🔧 FIXED: Updating booking payment info:', { id, stripeSessionId, stripePaymentIntentId });

    // Build update data
    const updateData: any = { updated_at: new Date().toISOString() };
    if (stripeSessionId) updateData.stripe_session_id = stripeSessionId;
    if (stripePaymentIntentId) updateData.stripe_payment_intent_id = stripePaymentIntentId;

    console.log('🔧 FIXED: Update data prepared:', updateData);

    // Use direct update without checking if booking exists first (to avoid race conditions)
    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ FIXED: Error updating booking payment:', error);
      throw new Error(`Failed to update booking payment: ${error.message}`);
    }

    // Check if any rows were updated
    if (!data || data.length === 0) {
      console.error('❌ FIXED: No rows updated for booking ID:', id);

      // Let's verify the booking exists
      const { data: checkData, error: checkError } = await supabase
        .from('bookings')
        .select('id, stripe_session_id, stripe_payment_intent_id')
        .eq('id', id);

      console.log('🔍 FIXED: Booking check result:', { checkData, checkError });

      if (checkError) {
        throw new Error(`Booking verification failed: ${checkError.message}`);
      }

      if (!checkData || checkData.length === 0) {
        throw new Error(`Booking not found with ID: ${id}`);
      }

      // If booking exists but update failed, it might be a permission issue
      throw new Error(`Booking exists but update failed. Booking ID: ${id}. This might be a database permission issue.`);
    }

    // Return the first (and should be only) updated row
    const updatedBooking = data[0];
    console.log('✅ FIXED: Booking payment info updated successfully:', {
      id: updatedBooking.id,
      stripe_session_id: updatedBooking.stripe_session_id,
      stripe_payment_intent_id: updatedBooking.stripe_payment_intent_id
    });
    return updatedBooking;
  },

  // Get bookings by email (for customer lookup)
  async getBookingsByEmail(email: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_email', email)
      .order('booking_date', { ascending: false });

    if (error) {
      console.error('Error fetching bookings by email:', error);
      throw new Error(`Failed to fetch bookings: ${error.message}`);
    }

    return data || [];
  },

  // Get bookings for a specific date (admin view)
  async getBookingsForDate(date: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_date', date)
      .neq('status', 'cancelled')
      .order('start_time');

    if (error) {
      console.error('Error fetching bookings for date:', error);
      throw new Error(`Failed to fetch bookings for date: ${error.message}`);
    }

    return data || [];
  },

  // Debug function to list all bookings
  async getAllBookings(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all bookings:', error);
      throw new Error(`Failed to fetch bookings: ${error.message}`);
    }

    return data || [];
  }
};

// Utility functions
export const formatTime = (time: string): string => {
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return time; // Return original if formatting fails
  }
};

export const addHours = (time: string, hours: number): string => {
  try {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setHours(date.getHours() + hours);
    return date.toTimeString().slice(0, 5);
  } catch (error) {
    console.error('Error adding hours to time:', error);
    return time; // Return original if calculation fails
  }
};

export const calculateEndTime = (startTime: string, durationHours: number): string => {
  return addHours(startTime, durationHours);
};