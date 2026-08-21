// app/booking-success/page.tsx - FIXED VERSION
"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Calendar, MapPin, Clock, Users, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { useState, useEffect } from 'react';

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

// Separate component for the actual content that uses useSearchParams
function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    const handleBookingFlow = async () => {
      try {
        if (canceled === 'true') {
          setError('Payment was canceled. Your booking has been canceled.');
          setLoading(false);
          return;
        }
        
        if (!sessionId) {
          setError('No session ID provided');
          setLoading(false);
          return;
        }

        await fetchBookingDetails(sessionId);
      } catch (err) {
        console.error('Error in booking flow:', err);
        setError('Failed to load booking information');
        setLoading(false);
      }
    };

    handleBookingFlow();
  }, [sessionId, canceled]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-bone pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-ink-60">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-bone pt-20 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold text-ink mb-2">
            {error?.includes('canceled') ? 'Payment Canceled' : 'Unable to Load Booking'}
          </h2>
          <p className="text-ink-60 mb-6">
            {error?.includes('canceled') 
              ? 'Your payment was canceled and the booking was not confirmed. You can try booking again.'
              : error || 'Could not find booking details'
            }
          </p>
          <div className="space-y-3">
            <Link 
              href="/member-resources/meeting-rooms" 
              className="block bg-orange-600 text-white px-6 py-2 hover:bg-orange-700 transition"
            >
              {error?.includes('canceled') ? 'Try Booking Again' : 'Back to Conference Room'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone pt-20">
      <section className="bg-gradient-to-br from-green-50 to-green-100 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-ink mb-4">
            Booking Confirmed!
          </h1>
          <p className="text-xl text-ink-60 mb-6">
            {booking.is_member_booking 
              ? 'Your member booking has been confirmed using your monthly hours.'
              : 'Your payment has been processed and your conference room is reserved.'
            }
          </p>
          <div className="inline-flex items-center bg-bone px-6 py-3 rounded-full">
            <span className="text-sm font-medium text-ink-60 mr-2">Booking ID:</span>
            <span className="font-mono text-sm text-ink">{booking.id}</span>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-bone overflow-hidden">
            <div className="bg-orange-50 px-6 py-4 border-b">
              <h2 className="font-display text-2xl font-semibold text-ink">Your Meeting Details</h2>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink mb-4">Booking Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-orange-600 mr-3" />
                        <span className="text-ink-60">
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
                        <span className="text-ink-60">
                          {booking.start_time} - {booking.end_time} ({booking.duration_hours} hour{booking.duration_hours > 1 ? 's' : ''})
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-orange-600 mr-3" />
                        <span className="text-ink-60">
                          {booking.attendees} {booking.attendees === 1 ? 'person' : 'people'}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 text-orange-600 mr-3" />
                        <span className="text-ink-60">{booking.room_name}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink mb-4">Contact Information</h3>
                    <div className="space-y-2">
                      <p className="text-ink-60"><strong>Name:</strong> {booking.customer_name}</p>
                      <p className="text-ink-60"><strong>Email:</strong> {booking.customer_email}</p>
                    </div>
                  </div>

                  {booking.purpose && (
                    <div>
                      <h3 className="font-display text-lg font-semibold text-ink mb-2">Meeting Purpose</h3>
                      <p className="text-ink-60">{booking.purpose}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink mb-4">Payment Summary</h3>
                    <div className="bg-linen p-4">
                      {booking.is_member_booking ? (
                        <div className="text-center">
                          <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                            ✨ Member Booking
                          </div>
                          <p className="text-2xl font-bold text-green-600">FREE</p>
                          <p className="text-sm text-ink-60">Using {booking.duration_hours} member hour{booking.duration_hours > 1 ? 's' : ''}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                            💳 Payment Completed
                          </div>
                          <p className="text-2xl font-bold text-ink">${booking.total_amount.toFixed(2)}</p>
                          <p className="text-sm text-ink-60">
                            Payment Status: <span className="text-green-600 font-medium">Paid</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink mb-4">Location</h3>
                    <div className="bg-orange-50 p-4">
                      <p className="font-medium text-ink">Merritt Workspace</p>
                      <p className="text-ink-60">2246 Irving Street</p>
                      <p className="text-ink-60">Denver, CO 80211</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-bone">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-center text-ink mb-12">What Happens Next?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">1. Confirmation Email</h3>
              <p className="text-ink-60">You'll receive a detailed confirmation email with all your booking information.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">2. Calendar Invite</h3>
              <p className="text-ink-60">A calendar invitation will be sent to help you remember your meeting time.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">3. Just Show Up!</h3>
              <p className="text-ink-60">Arrive a few minutes early and your room will be ready to go.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-linen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink mb-8">Need Anything Else?</h2>
          
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link href="/member-resources/meeting-rooms" className="block sm:inline-block bg-orange-600 text-white px-8 py-3 font-semibold hover:bg-orange-700 transition">
              Book Another Room
            </Link>
            
            <Link href="/contact" className="block sm:inline-block bg-bone text-orange-600 border-2 border-orange-600 px-8 py-3 font-semibold hover:bg-orange-50 transition">
              Contact Support
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// Main component with Suspense boundary
export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bone pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-ink-60">Loading booking confirmation...</p>
        </div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}