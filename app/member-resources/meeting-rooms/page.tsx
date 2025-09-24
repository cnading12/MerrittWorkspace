"use client";

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Monitor, Wifi, Coffee, MapPin, CheckCircle, XCircle, Loader2, AlertCircle, CreditCard, Gift } from 'lucide-react';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { meetingRoomAPI, formatTime, calculateEndTime, type MeetingRoom, type TimeSlot } from '@/lib/supabase';

interface BookingForm {
  name: string;
  email: string;
  company: string;
  phone: string;
  date: string;
  time: string;
  duration: number;
  attendees: number;
  purpose: string;
  bookingType: 'member' | 'paid' | null;
}

// NEW: Error Display Component
const ErrorDisplay = ({ error }: { error: string | null }) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-red-700 font-medium">Booking Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          {error.includes('Domain-Wide Delegation') && (
            <p className="text-red-600 text-sm mt-2">
              <strong>Note:</strong> Your booking is still valid - you'll receive email confirmation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// NEW: Success Message Component
const SuccessMessage = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
    <div className="flex items-start justify-between">
      <div className="flex items-start">
        <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
        <div>
          <p className="text-green-700 font-medium">Booking Successful!</p>
          <p className="text-green-600 text-sm mt-1 whitespace-pre-line">{message}</p>
        </div>
      </div>
      <button onClick={onClose} className="text-green-400 hover:text-green-600">
        <XCircle className="w-5 h-5" />
      </button>
    </div>
  </div>
);

// NEW: Loading State Component
const LoadingState = ({ message }: { message: string }) => (
  <div className="text-center py-8">
    <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
    <p className="text-gray-600">{message}</p>
    <p className="text-sm text-gray-500 mt-2">This may take a few moments...</p>
  </div>
);

export default function MeetingRoomsPage() {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [showBookingOptions, setShowBookingOptions] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // NEW
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    name: '',
    email: '',
    company: '',
    phone: '',
    date: '',
    time: '',
    duration: 1,
    attendees: 2,
    purpose: '',
    bookingType: null
  });

  useEffect(() => {
    loadRooms();
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setBookingForm(prev => ({ ...prev, date: today }));
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  const loadRooms = async () => {
    try {
      setError(null);
      console.log('Loading rooms from Supabase...');

      // Test Supabase connection first
      const { data: testData, error: testError } = await meetingRoomAPI.supabase
        .from('meeting_rooms')
        .select('count')
        .limit(1);

      if (testError) {
        throw new Error(`Supabase connection failed: ${testError.message}`);
      }

      const roomsData = await meetingRoomAPI.getRooms();
      console.log('Rooms loaded successfully:', roomsData);

      if (roomsData.length === 0) {
        setError('No meeting rooms found. Please ensure your database has meeting room data.');
        return;
      }

      setRooms(roomsData);
      setSelectedRoom(roomsData[0]); // Select first room by default
    } catch (error) {
      console.error('Error loading rooms:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to load meeting rooms: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate) return;

    setLoadingSlots(true);
    setError(null);

    try {
      console.log('🏢 Loading availability for THE conference room on:', selectedDate);

      // Simple API call - no room ID needed since there's only one room
      const response = await fetch(`/api/availability?date=${selectedDate}`);
      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Conference room availability loaded:', {
          total: data.total_slots,
          available: data.available_slots,
          booked: data.booked_times
        });
        setAvailableSlots(data.time_slots);

        // Show helpful info if times are booked
        if (data.booked_times && data.booked_times.length > 0) {
          console.log('🚫 Currently booked times:', data.booked_times.join(', '));
        }
      } else {
        throw new Error(data.error || 'Failed to load availability');
      }

    } catch (error) {
      console.error('Error loading time slots:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to load available time slots: ${errorMessage}`);

      // Fallback: generate basic time slots
      const fallbackSlots: TimeSlot[] = [];
      for (let hour = 8; hour <= 18; hour++) {
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        fallbackSlots.push({
          time_slot: timeString,
          is_available: true
        });
      }
      setAvailableSlots(fallbackSlots);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleTimeSelect = async (time: string) => {
    if (!selectedRoom) return;

    const endTime = calculateEndTime(time, bookingForm.duration);

    // Check availability for the selected duration
    try {
      setError(null);
      const isAvailable = await meetingRoomAPI.checkAvailability(
        selectedRoom.id,
        selectedDate,
        time,
        endTime
      );

      if (!isAvailable) {
        setError('This time slot is not available for the selected duration. Please choose a different time or duration.');
        return;
      }

      setSelectedTime(time);
      setBookingForm(prev => ({ ...prev, time }));
      setShowBookingOptions(true);
      setShowBookingForm(false);
    } catch (error) {
      console.error('Error checking availability:', error);
      setError('Failed to check availability. Please try again.');
    }
  };

  const handleDurationChange = (duration: number) => {
    setBookingForm(prev => ({ ...prev, duration }));

    // If time is already selected, recheck availability
    if (selectedTime && selectedRoom) {
      const endTime = calculateEndTime(selectedTime, duration);
      meetingRoomAPI.checkAvailability(
        selectedRoom.id,
        selectedDate,
        selectedTime,
        endTime
      ).then(isAvailable => {
        if (!isAvailable) {
          setError('The selected duration is not available for this time slot. Please choose a different duration or time.');
          setShowBookingOptions(false);
          setShowBookingForm(false);
          setSelectedTime('');
        }
      }).catch(error => {
        console.error('Error checking availability:', error);
      });
    }
  };

  // UPDATED: Better booking type selection
  const handleBookingTypeSelection = async (type: 'member' | 'paid') => {
    setBookingForm(prev => ({ ...prev, bookingType: type }));

    // For member bookings, we don't need room selection since there's only one room
    if (type === 'member') {
      // Skip room selection and go straight to form
      setShowBookingForm(true);
    } else {
      // For paid bookings, ensure a room is selected
      if (!selectedRoom && rooms.length > 0) {
        setSelectedRoom(rooms[0]); // Select first available room
      }
      setShowBookingForm(true);
    }
  };

  const calculatePrice = (duration: number) => {
    return selectedRoom ? selectedRoom.hourly_rate * duration : 0;
  };

  // UPDATED: Improved booking submission with better error handling
  // Updated section of app/member-resources/meeting-rooms/page.tsx
  // Only showing the updated handleSubmitBooking function and related changes

  // UPDATED: Improved booking submission with Stripe payment handling
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoom && bookingForm.bookingType !== 'member') {
      setError('Please select a room');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const endTime = calculateEndTime(selectedTime, bookingForm.duration);
      const totalAmount = bookingForm.bookingType === 'member' ? 0 : calculatePrice(bookingForm.duration);

      // Prepare booking data
      const bookingPayload: any = {
        customer_name: bookingForm.name,
        customer_email: bookingForm.email,
        customer_phone: bookingForm.phone || '',
        company: bookingForm.company || '',
        booking_date: selectedDate,
        start_time: selectedTime,
        duration_hours: bookingForm.duration,
        attendees: bookingForm.attendees,
        purpose: bookingForm.purpose || '',
        is_member_booking: bookingForm.bookingType === 'member'
      };

      // Add room and payment info only for paid bookings
      if (bookingForm.bookingType !== 'member') {
        bookingPayload.room_id = selectedRoom!.id;
        bookingPayload.total_amount = totalAmount;
      }

      console.log('Submitting booking:', bookingPayload);

      // Create booking via API route
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      console.log('Booking response:', data);

      if (bookingForm.bookingType === 'member') {
        // Show success message for member booking
        const successMsg = `🎉 Member booking confirmed! 
        
✅ Booking ID: ${data.booking.id}
📅 Date: ${new Date(selectedDate).toLocaleDateString()}
⏰ Time: ${selectedTime} - ${data.booking.end_time}
⌛ Duration: ${bookingForm.duration} hour${bookingForm.duration > 1 ? 's' : ''}
👥 Attendees: ${bookingForm.attendees}

📧 A confirmation email with calendar invitation has been sent to ${bookingForm.email}

✨ Your meeting room is ready to go!`;

        setSuccessMessage(successMsg);
      } else {
        // For paid bookings, redirect to Stripe checkout
        if (data.checkout_url) {
          console.log('Redirecting to Stripe checkout:', data.checkout_url);

          // Show loading message before redirect
          setSuccessMessage(`Creating payment session... 
          
Booking ID: ${data.booking.id}
Total: $${totalAmount.toFixed(2)}

You will be redirected to secure payment in a moment.`);

          // Small delay to show the message, then redirect
          setTimeout(() => {
            window.location.href = data.checkout_url;
          }, 2000);

          return;
        } else if (data.fallback) {
          // Payment system error fallback
          setError(`Booking created but payment system is currently unavailable. 
          
Booking ID: ${data.booking.id}
Please contact us to complete payment: (303) 555-0123
          
Your time slot is temporarily reserved.`);
          return;
        } else {
          setSuccessMessage(`Booking created successfully! 
          
Booking ID: ${data.booking.id}
Total: $${totalAmount.toFixed(2)}

Payment processing...`);
        }
      }

      // Reset form
      setShowBookingForm(false);
      setShowBookingOptions(false);
      setSelectedTime('');
      setBookingForm(prev => ({
        ...prev,
        name: '',
        email: '',
        company: '',
        phone: '',
        purpose: '',
        bookingType: null
      }));

      // Reload available slots
      loadAvailableSlots();

    } catch (error) {
      console.error('Error creating booking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create booking. Please try again.';

      // Show user-friendly error messages
      if (errorMessage.includes('conflicts')) {
        setError('This time slot is no longer available. Please select a different time.');
      } else if (errorMessage.includes('Domain-Wide Delegation')) {
        setError('Booking created but calendar invitation may not be sent automatically. You will receive an email confirmation.');
      } else if (errorMessage.includes('Payment system')) {
        setError('Payment system is temporarily unavailable. Please try again in a few minutes or contact support.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <LoadingState message="Loading meeting rooms..." />
      </div>
    );
  }

  if (error && rooms.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadRooms}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-50 to-orange-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Professional Meeting Rooms
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Book our state-of-the-art conference rooms with A/V equipment, high-speed wifi,
              and a professional atmosphere. Members get simple booking with no payment required!
            </p>
          </div>
        </div>
      </section>

      {/* UPDATED: Better Error and Success Display */}
      {(error || successMessage) && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <ErrorDisplay error={error} />
          {successMessage && (
            <SuccessMessage
              message={successMessage}
              onClose={() => setSuccessMessage(null)}
            />
          )}
        </div>
      )}

      {/* Member Benefits */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Member Benefits</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Gift className="w-6 h-6 text-orange-600 mr-3" />
                  <span className="text-lg">Simple member booking process</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  <span className="text-lg">No payment required for members</span>
                </div>
                <div className="flex items-center">
                  <CreditCard className="w-6 h-6 text-blue-600 mr-3" />
                  <span className="text-lg">Easy online payment for non-members</span>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-orange-900 mb-4">Pricing</h3>
              <div className="space-y-2">
                <p className="text-orange-800">
                  <strong>Members:</strong> FREE booking
                </p>
                <p className="text-orange-800">
                  <strong>Non-members:</strong> ${selectedRoom?.hourly_rate || 25}/hour
                </p>
                <p className="text-sm text-orange-600 mt-2">
                  Minimum 1 hour • Maximum 4 hours per session
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Book Your Meeting Room</h2>

          {/* Date Selection */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-900 mb-4">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setBookingForm(prev => ({ ...prev, date: e.target.value }));
                setSelectedTime('');
                setShowBookingOptions(false);
                setShowBookingForm(false);
                setError(null);
                setSuccessMessage(null);
              }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-900 mb-4">Available Time Slots</label>

              {loadingSlots ? (
                <LoadingState message="Loading available times..." />
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {availableSlots.map(({ time_slot, is_available }) => {
                    const displayTime = formatTime(time_slot);
                    const isSelected = selectedTime === time_slot;

                    return (
                      <button
                        key={time_slot}
                        onClick={() => is_available && handleTimeSelect(time_slot)}
                        disabled={!is_available}
                        className={`p-3 rounded-lg border-2 font-medium transition ${!is_available
                            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                            : isSelected
                              ? 'bg-orange-600 border-orange-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-orange-500 hover:text-orange-600'
                          }`}
                      >
                        {displayTime}
                        {!is_available && <XCircle className="w-4 h-4 inline ml-1" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No time slots available. Please check your database setup.</p>
                </div>
              )}
            </div>
          )}

          {/* Booking Type Selection */}
          {showBookingOptions && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Choose Booking Type</h3>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Member Booking */}
                <div
                  className={`p-6 border-2 rounded-xl cursor-pointer transition ${bookingForm.bookingType === 'member'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                    }`}
                  onClick={() => handleBookingTypeSelection('member')}
                >
                  <div className="flex items-center mb-4">
                    <Gift className="w-8 h-8 text-green-600 mr-3" />
                    <h4 className="text-lg font-semibold text-gray-900">Member Booking</h4>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Simple booking for members. No payment required!
                  </p>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <p className="text-green-800 font-medium">✓ Free with membership</p>
                    <p className="text-sm text-green-700">Duration: {bookingForm.duration} hour{bookingForm.duration > 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Paid Booking */}
                <div
                  className={`p-6 border-2 rounded-xl cursor-pointer transition ${bookingForm.bookingType === 'paid'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                    }`}
                  onClick={() => handleBookingTypeSelection('paid')}
                >
                  <div className="flex items-center mb-4">
                    <CreditCard className="w-8 h-8 text-orange-600 mr-3" />
                    <h4 className="text-lg font-semibold text-gray-900">Pay Online</h4>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Pay securely online. Not a member yet?
                  </p>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <p className="text-orange-800 font-medium">${calculatePrice(bookingForm.duration)} total</p>
                    <p className="text-sm text-orange-700">Duration: {bookingForm.duration} hour{bookingForm.duration > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              {/* Duration Selection */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
                <select
                  value={bookingForm.duration}
                  onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={3}>3 hours</option>
                  <option value={4}>4 hours</option>
                </select>
              </div>
            </div>
          )}

          {/* Booking Form */}
          {showBookingForm && (
            <div className="bg-white p-6 rounded-xl border">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                {bookingForm.bookingType === 'member' ? 'Complete Member Booking' : 'Complete Payment Booking'}
              </h3>

              <form onSubmit={handleSubmitBooking} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {bookingForm.bookingType === 'paid' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                        <input
                          type="text"
                          value={bookingForm.company}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, company: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input
                          type="tel"
                          value={bookingForm.phone}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Attendees</label>
                    <select
                      value={bookingForm.attendees}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, attendees: parseInt(e.target.value) }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      {Array.from({ length: selectedRoom?.capacity || 8 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} {num === 1 ? 'person' : 'people'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Purpose</label>
                  <textarea
                    rows={3}
                    value={bookingForm.purpose}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Brief description of your meeting (optional)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Booking Summary */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-2">Booking Summary</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Room:</strong> Conference Room</p>
                    <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {formatTime(selectedTime)} - {formatTime(calculateEndTime(selectedTime, bookingForm.duration))}</p>
                    <p><strong>Duration:</strong> {bookingForm.duration} hour{bookingForm.duration > 1 ? 's' : ''}</p>
                    <p><strong>Type:</strong> {bookingForm.bookingType === 'member' ? 'Member Booking' : 'Paid Booking'}</p>
                    <p className="text-lg font-semibold text-orange-600 pt-2">
                      Total: {bookingForm.bookingType === 'member' ? 'FREE' : `${calculatePrice(bookingForm.duration)}`}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-orange-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Creating Booking...
                    </>
                  ) : bookingForm.bookingType === 'member' ? (
                    'Confirm Member Booking'
                  ) : (
                    'Proceed to Payment'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Room Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What's Included</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <Monitor className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">75" Smart TV</h3>
              <p className="text-gray-600">Present wirelessly or via HDMI with crystal clear 4K display</p>
            </div>

            <div className="text-center">
              <Wifi className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">High-Speed WiFi</h3>
              <p className="text-gray-600">Reliable internet for video calls and online presentations</p>
            </div>

            <div className="text-center">
              <Users className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Seats up to 8</h3>
              <p className="text-gray-600">Comfortable seating for small to medium team meetings</p>
            </div>

            <div className="text-center">
              <Coffee className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Refreshments</h3>
              <p className="text-gray-600">Access to our snackshop for coffee and light refreshments</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help or Have Questions?</h2>
          <p className="text-gray-600 mb-6">
            Our team is here to help you have a successful meeting experience.
          </p>
          <Link href="/contact" className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition inline-block">
            Contact Us
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}