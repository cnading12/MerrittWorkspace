// app/booking-success/member/page.tsx
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Calendar, MapPin, Clock, Users, Loader2, AlertCircle, Gift, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/Footer';

interface MemberBookingDetails {
  id: string;
  customer_name: string;
  customer_email: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  attendees: number;
  purpose?: string;
  status: string;
  payment_status: string;
  calendar_event_created: boolean;
  calendar_event_id?: string;
}

function MemberBookingSuccessContent() {
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<MemberBookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const encodedData = searchParams.get('data');
      
      if (!encodedData) {
        setError('No booking data found');
        setLoading(false);
        return;
      }

      // Decode the booking data
      const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');
      const bookingData = JSON.parse(decodedData);
      
      console.log('Decoded member booking data:', bookingData);
      setBooking(bookingData);
      
    } catch (err) {
      console.error('Error decoding booking data:', err);
      setError('Failed to load booking information');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your booking confirmation...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Booking</h2>
          <p className="text-gray-600 mb-6">{error || 'Could not find booking details'}</p>
          <div className="space-y-3">
            <Link 
              href="/member-resources/meeting-rooms" 
              className="block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition"
            >
              Back to Meeting Rooms
            </Link>
            <p className="text-sm text-gray-500">
              Need help? <Link href="/contact" className="text-orange-600 hover:underline">Contact Support</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Success Header */}
      <section className="bg-gradient-to-br from-green-50 to-green-100 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <Gift className="w-10 h-10 text-orange-600" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Member Booking Confirmed!
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Your meeting room has been reserved using your member hours. No payment required!
          </p>
          
          <div className="inline-flex items-center bg-white px-6 py-3 rounded-full shadow-sm">
            <Gift className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-sm font-medium text-gray-600 mr-2">Booking ID:</span>
            <span className="font-mono text-sm text-gray-900">{booking.id}</span>
          </div>
        </div>
      </section>

      {/* Booking Details */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-green-50 px-6 py-4 border-b border-green-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Your Member Booking</h2>
                <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  <Gift className="w-4 h-4 mr-1" />
                  FREE with Membership
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left Column - Booking Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Information</h3>
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
                        <span className="text-gray-700">Conference Room</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Details</h3>
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

                {/* Right Column - Member Benefits & Location */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Benefits</h3>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="text-center">
                        <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                          ✨ Member Booking
                        </div>
                        <p className="text-2xl font-bold text-green-600">FREE</p>
                        <p className="text-sm text-gray-600">Used {booking.duration_hours} member hour{booking.duration_hours > 1 ? 's' : ''}</p>
                        <p className="text-xs text-green-700 mt-2">Member hours reset monthly</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="font-medium text-gray-900">Merritt Workspace</p>
                      <p className="text-gray-700">2246 Irving Street</p>
                      <p className="text-gray-700">Denver, CO 80211</p>
                      <p className="text-xs text-gray-600 mt-2">
                        Historic Sloan's Lake Location
                      </p>
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

                  {/* Calendar Status */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendar Status</h3>
                    <div className={`p-4 rounded-lg border ${
                      booking.calendar_event_created 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      {booking.calendar_event_created ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          <span className="text-green-800 font-medium">Calendar event created</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                          <span className="text-yellow-800 font-medium">Calendar event pending</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-600 mt-1">
                        You'll receive a calendar invitation via email
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Happens Next */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What Happens Next?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">1. Confirmation Email</h3>
              <p className="text-gray-600">You'll receive a confirmation email with all your booking details and member hour usage.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">2. Calendar Invitation</h3>
              <p className="text-gray-600">A calendar invite will be sent to help you remember your meeting time.</p>
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
            
            <Link href="/member-resources/snackshop" className="block sm:inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition">
              Order Snacks
            </Link>
            
            <Link href="/contact" className="block sm:inline-block bg-white text-orange-600 border-2 border-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-orange-50 transition">
              Contact Support
            </Link>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Questions about your booking? Call us at <a href="tel:(303)359-8337" className="text-orange-600 hover:underline">(303) 359-8337</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default function MemberBookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading booking confirmation...</p>
        </div>
      </div>
    }>
      <MemberBookingSuccessContent />
    </Suspense>
  );
}