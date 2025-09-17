"use client";

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Monitor, Wifi, Coffee, MapPin, CheckCircle, XCircle, Loader2 } from 'lucide-react';
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
}

export default function MeetingRoomsPage() {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    name: '',
    email: '',
    company: '',
    phone: '',
    date: '',
    time: '',
    duration: 1,
    attendees: 2,
    purpose: ''
  });

  useEffect(() => {
    loadRooms();
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setBookingForm(prev => ({ ...prev, date: today }));
  }, []);

  useEffect(() => {
    if (selectedRoom && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedRoom, selectedDate]);

  const loadRooms = async () => {
    try {
      const roomsData = await meetingRoomAPI.getRooms();
      setRooms(roomsData);
      if (roomsData.length > 0) {
        setSelectedRoom(roomsData[0]); // Select first room by default
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      alert('Failed to load meeting rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedRoom || !selectedDate) return;
    
    setLoadingSlots(true);
    try {
      const slots = await meetingRoomAPI.getAvailableSlots(selectedRoom.id, selectedDate);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading time slots:', error);
      alert('Failed to load available time slots. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleTimeSelect = async (time: string) => {
    if (!selectedRoom) return;
    
    const endTime = calculateEndTime(time, bookingForm.duration);
    
    // Check availability for the selected duration
    try {
      const isAvailable = await meetingRoomAPI.checkAvailability(
        selectedRoom.id,
        selectedDate,
        time,
        endTime
      );
      
      if (!isAvailable) {
        alert('This time slot is not available for the selected duration. Please choose a different time or duration.');
        return;
      }
      
      setSelectedTime(time);
      setBookingForm(prev => ({ ...prev, time }));
      setShowBookingForm(true);
    } catch (error) {
      console.error('Error checking availability:', error);
      alert('Failed to check availability. Please try again.');
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
          alert('The selected duration is not available for this time slot. Please choose a different duration or time.');
          setShowBookingForm(false);
          setSelectedTime('');
        }
      });
    }
  };

  const calculatePrice = (duration: number) => {
    return selectedRoom ? selectedRoom.hourly_rate * duration : 0;
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRoom) return;
    
    setSubmitting(true);
    
    try {
      const endTime = calculateEndTime(selectedTime, bookingForm.duration);
      const totalAmount = calculatePrice(bookingForm.duration);
      
      // Create booking via API route
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: selectedRoom.id,
          customer_name: bookingForm.name,
          customer_email: bookingForm.email,
          customer_phone: bookingForm.phone,
          company: bookingForm.company,
          booking_date: selectedDate,
          start_time: selectedTime,
          end_time: endTime,
          duration_hours: bookingForm.duration,
          total_amount: totalAmount,
          attendees: bookingForm.attendees,
          purpose: bookingForm.purpose,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      console.log('Booking created:', data.booking);
      
      // In production, this would redirect to Stripe checkout
      // For now, simulate successful creation
      alert(`Booking created successfully! 
      
Booking ID: ${data.booking.id}
Total: $${totalAmount}

In production, you would now be redirected to Stripe checkout for secure payment.

A calendar invitation will be sent to ${bookingForm.email} once payment is complete.`);
      
      // Reset form
      setShowBookingForm(false);
      setSelectedTime('');
      setBookingForm(prev => ({
        ...prev,
        name: '',
        email: '',
        company: '',
        phone: '',
        purpose: ''
      }));
      
      // Reload available slots
      loadAvailableSlots();
      
    } catch (error) {
      console.error('Error creating booking:', error);
      alert(error instanceof Error ? error.message : 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-burnt-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading meeting rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-burnt-orange-50 to-burnt-orange-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Professional Meeting Rooms
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Book our state-of-the-art conference rooms with A/V equipment, high-speed wifi, 
              and a professional atmosphere perfect for client meetings and team collaborations.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How Booking Works</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-burnt-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">1. Select Date & Time</h3>
              <p className="text-gray-600">Choose your preferred date and available time slot from our live calendar</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-burnt-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">2. Enter Details</h3>
              <p className="text-gray-600">Provide your contact info, meeting purpose, and number of attendees</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-burnt-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">3. Secure Payment</h3>
              <p className="text-gray-600">Complete your booking with secure Stripe payment processing</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-burnt-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-burnt-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">4. You're All Set!</h3>
              <p className="text-gray-600">Receive confirmation email and calendar invite. Just show up!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Room Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What's Included</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <Monitor className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">75" Smart TV</h3>
              <p className="text-gray-600">Present wirelessly or via HDMI with crystal clear 4K display</p>
            </div>
            
            <div className="text-center">
              <Wifi className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">High-Speed WiFi</h3>
              <p className="text-gray-600">Reliable internet for video calls and online presentations</p>
            </div>
            
            <div className="text-center">
              <Users className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Seats up to 8</h3>
              <p className="text-gray-600">Comfortable seating for small to medium team meetings</p>
            </div>
            
            <div className="text-center">
              <Coffee className="w-12 h-12 text-burnt-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Refreshments</h3>
              <p className="text-gray-600">Access to our snackshop for coffee and light refreshments</p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Book Your Meeting Room</h2>
          
          {/* Pricing */}
          <div className="bg-burnt-orange-50 p-6 rounded-xl mb-8 text-center">
            <h3 className="text-2xl font-bold text-burnt-orange-900 mb-2">
              ${selectedRoom?.hourly_rate || 25} per hour
            </h3>
            <p className="text-burnt-orange-700">Minimum 1 hour booking • Maximum 4 hours per session</p>
            {selectedRoom && (
              <p className="text-sm text-burnt-orange-600 mt-2">
                Capacity: {selectedRoom.capacity} people
              </p>
            )}
          </div>

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
                setShowBookingForm(false);
              }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500 focus:border-burnt-orange-500"
            />
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-900 mb-4">Available Time Slots</label>
              
              {loadingSlots ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-burnt-orange-600 mx-auto mb-2" />
                  <p className="text-gray-600">Loading available times...</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {availableSlots.map(({ time_slot, is_available }) => {
                    const displayTime = formatTime(time_slot);
                    const isSelected = selectedTime === time_slot;
                    
                    return (
                      <button
                        key={time_slot}
                        onClick={() => is_available && handleTimeSelect(time_slot)}
                        disabled={!is_available}
                        className={`p-3 rounded-lg border-2 font-medium transition ${
                          !is_available
                            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-burnt-orange-600 border-burnt-orange-600 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-burnt-orange-500 hover:text-burnt-orange-600'
                        }`}
                      >
                        {displayTime}
                        {!is_available && <XCircle className="w-4 h-4 inline ml-1" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Booking Form */}
          {showBookingForm && (
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Complete Your Booking</h3>
              
              <form onSubmit={handleSubmitBooking} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <input
                      type="text"
                      value={bookingForm.company}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours) *</label>
                    <select
                      required
                      value={bookingForm.duration}
                      onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                    >
                      <option value={1}>1 hour - ${calculatePrice(1)}</option>
                      <option value={2}>2 hours - ${calculatePrice(2)}</option>
                      <option value={3}>3 hours - ${calculatePrice(3)}</option>
                      <option value={4}>4 hours - ${calculatePrice(4)}</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Attendees</label>
                    <select
                      value={bookingForm.attendees}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, attendees: parseInt(e.target.value) }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange-500"
                  />
                </div>

                {/* Booking Summary */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-2">Booking Summary</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Room:</strong> {selectedRoom?.name}</p>
                    <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {formatTime(selectedTime)} - {formatTime(calculateEndTime(selectedTime, bookingForm.duration))}</p>
                    <p><strong>Duration:</strong> {bookingForm.duration} hour{bookingForm.duration > 1 ? 's' : ''}</p>
                    <p className="text-lg font-semibold text-burnt-orange-600 pt-2">
                      Total: ${calculatePrice(bookingForm.duration)}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-burnt-orange-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-burnt-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Creating Booking...
                    </>
                  ) : (
                    'Proceed to Payment'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-burnt-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help or Have Questions?</h2>
          <p className="text-gray-600 mb-6">
            Our team is here to help you have a successful meeting experience.
          </p>
          <Link href="/contact" className="bg-burnt-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-burnt-orange-700 transition inline-block">
            Contact Us
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}