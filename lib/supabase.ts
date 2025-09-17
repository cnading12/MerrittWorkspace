import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  // Get all active meeting rooms
  async getRooms(): Promise<MeetingRoom[]> {
    const { data, error } = await supabase
      .from('meeting_rooms')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
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
    
    if (error) throw error;
    return data;
  },

  // Get available time slots for a specific date
  async getAvailableSlots(roomId: string, date: string): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .rpc('get_available_slots', {
        p_room_id: roomId,
        p_date: date
      });
    
    if (error) throw error;
    return data || [];
  },

  // Check if a specific time slot is available
  async checkAvailability(
    roomId: string, 
    date: string, 
    startTime: string, 
    endTime: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('check_room_availability', {
        p_room_id: roomId,
        p_date: date,
        p_start_time: startTime,
        p_end_time: endTime
      });
    
    if (error) throw error;
    return data;
  },

  // Create a new booking
  async createBooking(booking: Partial<Booking>): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get booking by ID
  async getBooking(id: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update booking status
  async updateBookingStatus(
    id: string, 
    status: Booking['status'], 
    paymentStatus?: Booking['payment_status']
  ): Promise<Booking> {
    const updateData: any = { status };
    if (paymentStatus) updateData.payment_status = paymentStatus;

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update booking with Stripe information
  async updateBookingPayment(
    id: string,
    stripeSessionId?: string,
    stripePaymentIntentId?: string
  ): Promise<Booking> {
    const updateData: any = {};
    if (stripeSessionId) updateData.stripe_session_id = stripeSessionId;
    if (stripePaymentIntentId) updateData.stripe_payment_intent_id = stripePaymentIntentId;

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get bookings by email (for customer lookup)
  async getBookingsByEmail(email: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_email', email)
      .order('booking_date', { ascending: false });
    
    if (error) throw error;
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
    
    if (error) throw error;
    return data || [];
  }
};

// Utility functions
export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const addHours = (time: string, hours: number): string => {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setHours(date.getHours() + hours);
  return date.toTimeString().slice(0, 5);
};

export const calculateEndTime = (startTime: string, durationHours: number): string => {
  return addHours(startTime, durationHours);
};