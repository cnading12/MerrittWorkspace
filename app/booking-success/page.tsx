// app/booking-success/page.tsx - FIXED VERSION
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Calendar, MapPin, Clock, Users, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/Footer';

interface BookingDetails {
  id: string;
  customer_name: string;
  customer_email: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_amount: number;
  attendees: number;
  purpose?: string;
  room_name: string;
  is_member_booking: boolean;
  status: string;
  payment_status: string;
}

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FIXED: Move all state and search params logic to the top, before any conditional logic
  const sessionId = searchParams.get('session_id');
  const canceled = searchParams.get('canceled');
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    const handleBookingFlow = async () => {
      try {
        // Handle canceled payment
        if (canceled === 'true') {
          setError('Payment was canceled. Your booking has been canceled.');
          setLoading(false);
          return;
        }
        
        // Handle missing session ID
        if (!sessionId) {
          setError('No session ID provided');
          setLoading(false);
          return;
        }

        // Fetch booking details
        await fetchBookingDetails(sessionId);
      } catch (err) {
        console.error('Error in booking flow:', err);
        setError('Failed to load booking information');
        setLoading(false);
      }
    };

    handleBookingFlow();
  }, [sessionId, canceled]); // Dependencies are now stable

  const fetchBookingDetails = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/booking-success?session_id=${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch booking details');
      }

      setBooking(data.booking);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error?.includes('canceled') ? 'Payment Canceled' : 'Unable to Load Booking'}
          </h2>
          <p className="text-gray-600 mb-6">
            {error?.includes('canceled') 
              ? 'Your payment was canceled and the booking was not confirmed. You can try booking again.'
              : error || 'Could not find booking details'
            }
          </p>
          <div className="space-y-3">
            <Link 
              href="/member-resources/meeting-rooms" 
              className="block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition"
            >
              {error?.includes('canceled') ? 'Try Booking Again' : 'Back to Meeting Rooms'}
            </Link>
            {error?.includes('canceled') && (
              <p className="text-sm text-gray-500">
                Need help? <Link href="/contact" className="text-orange-600 hover:underline">Contact Support</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success state - booking found
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Success Header */}
      <section className="bg-gradient-to-br from-green-50 to-green-100 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Booking Confirmed!
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            {booking.is_member_booking 
              ? 'Your member booking has been confirmed using your monthly hours.'
              : 'Your payment has been processed and your meeting room is reserved.'
            }
          </p>
          <div className="inline-flex items-center bg-white px-6 py-3 rounded-full shadow-sm">
            <span className="text-sm font-medium text-gray-600 mr-2">Booking ID:</span>
            <span className="font-mono text-sm text-gray-900">{booking.id}</span>
          </div>
        </div>
      </section>

      {/* Booking Details */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-orange-50 px-6 py-4 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Your Meeting Details</h2>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-orange-600 mr-3" />
                        <span className="text-gray-700">
                          {new Date(booking.booking_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <Clock className="w-5 h-5 text-orange-600 mr-3" />
                        <span className="text-gray-700">
                          {booking.start_time} - {booking.end_time} ({booking.duration_hours} hour{booking.duration_hours > 1 ? 's' : ''})
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-orange-600 mr-3" />
                        <span className="text-gray-700">
                          {booking.attendees} {booking.attendees === 1 ? 'person' : 'people'}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 text-orange-600 mr-3" />
                        <span className="text-gray-700">
                          {booking.room_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <div className="space-y-2">
                      <p className="text-gray-700"><strong>Name:</strong> {booking.customer_name}</p>
                      <p className="text-gray-700"><strong>Email:</strong> {booking.customer_email}</p>
                    </div>
                  </div>

                  {booking.purpose && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Meeting Purpose</h3>
                      <p className="text-gray-700">{booking.purpose}</p>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      {booking.is_member_booking ? (
                        <div className="text-center">
                          <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                            ✨ Member Booking
                          </div>
                          <p className="text-2xl font-bold text-green-600">FREE</p>
                          <p className="text-sm text-gray-600">Using {booking.duration_hours} member hour{booking.duration_hours > 1 ? 's' : ''}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                            💳 Payment Completed
                          </div>
                          <p className="text-2xl font-bold text-gray-900">${booking.total_amount.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">
                            Payment Status: <span className="text-green-600 font-medium">Paid</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Charged to your payment method
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="font-medium text-gray-900">Merritt Workspace</p>
                      <p className="text-gray-700">2246 Irving Street</p>
                      <p className="text-gray-700">Denver, CO 80211</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Included</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• 75" Smart TV with wireless presentation</li>
                      <li>• High-speed WiFi</li>
                      <li>• Conference calling capabilities</li>
                      <li>• Comfortable seating</li>
                      <li>• Access to snackshop</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What Happens Next?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">1. Confirmation Email</h3>
              <p className="text-gray-600">You'll receive a detailed confirmation email with all your booking information.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">2. Calendar Invite</h3>
              <p className="text-gray-600">A calendar invitation will be sent to help you remember your meeting time.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">3. Just Show Up!</h3>
              <p className="text-gray-600">Arrive a few minutes early and your room will be ready to go.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Need Anything Else?</h2>
          
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link href="/member-resources/meeting-rooms" className="block sm:inline-block bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-700 transition">
              Book Another Room
            </Link>
            
            <Link href="/contact" className="block sm:inline-block bg-white text-orange-600 border-2 border-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-orange-50 transition">
              Contact Support
            </Link>
            
            <Link href="/member-resources" className="block sm:inline-block bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition">
              Member Resources
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}