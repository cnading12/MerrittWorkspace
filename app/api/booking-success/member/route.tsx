// app/booking-success/member/page.tsx
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  CheckCircle, Calendar, MapPin, Clock, Users, Loader2, AlertCircle, 
  Gift, Mail, Phone, Star, Coffee, Wifi, Monitor, ArrowRight,
  Download, Share2, Copy, CheckSquare
} from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

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

  const copyBookingDetails = async () => {
    if (!booking) return;
    
    const bookingText = `
🎉 Meeting Room Booking Confirmed

📋 Booking ID: ${booking.id}
👤 Name: ${booking.customer_name}
📅 Date: ${new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    })}
⏰ Time: ${booking.start_time} - ${booking.end_time}
⌛ Duration: ${booking.duration_hours} hour${booking.duration_hours > 1 ? 's' : ''}
👥 Attendees: ${booking.attendees}
🏢 Location: Merritt House Conference Room
💳 Member Booking: FREE
    `;

    try {
      await navigator.clipboard.writeText(bookingText.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading your booking confirmation...</p>
          <p className="text-gray-500 text-sm mt-2">Just a moment while we get your details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load Booking</h2>
          <p className="text-gray-600 mb-8">{error || 'Could not find booking details. Your booking may still be valid - check your email for confirmation.'}</p>
          <div className="space-y-3">
            <Link 
              href="/member-resources/meeting-rooms" 
              className="block bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              Back to Meeting Rooms
            </Link>
            <p className="text-sm text-gray-500">
              Need help? <Link href="/contact" className="text-orange-600 hover:underline font-medium">Contact Support</Link> or call <a href="tel:(303)359-8337" className="text-orange-600 hover:underline font-medium">(303) 359-8337</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Success Header */}
      <section className="bg-gradient-to-br from-green-50 via-green-50 to-orange-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mr-4 shadow-lg">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center shadow-lg">
              <Gift className="w-12 h-12 text-orange-600" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Member Booking Confirmed! 🎉
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-4">
            Your meeting room has been reserved using your member hours.
          </p>
          <p className="text-lg text-green-600 font-semibold mb-8">
            No payment required - it's all included in your membership!
          </p>
          
          <div className="inline-flex items-center bg-white px-6 py-3 rounded-full shadow-lg border">
            <span className="text-sm font-medium text-gray-600 mr-2">Booking ID:</span>
            <span className="font-mono text-lg text-gray-900 font-bold">{booking.id}</span>
            <button
              onClick={copyBookingDetails}
              className="ml-3 p-2 text-gray-400 hover:text-orange-600 transition"
              title="Copy booking details"
            >
              {copied ? <CheckSquare className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </section>

      {/* Booking Details Card */}
      <section className="py-16 -mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Your Meeting Details</h2>
              <p className="text-orange-100 mt-2">Everything you need to know about your booking</p>
            </div>
            
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-12">
                {/* Left Column - Booking Info */}
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <Calendar className="w-6 h-6 text-orange-600 mr-3" />
                      Booking Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start bg-gray-50 p-4 rounded-lg">
                        <Calendar className="w-6 h-6 text-orange-600 mr-4 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900">Date</p>
                          <p className="text-gray-700 text-lg">{formatDate(booking.booking_date)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start bg-gray-50 p-4 rounded-lg">
                        <Clock className="w-6 h-6 text-orange-600 mr-4 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900">Time</p>
                          <p className="text-gray-700 text-lg">
                            {booking.start_time} - {booking.end_time}
                          </p>
                          <p className="text-gray-600 text-sm">
                            Duration: {booking.duration_hours} hour{booking.duration_hours > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start bg-gray-50 p-4 rounded-lg">
                        <Users className="w-6 h-6 text-orange-600 mr-4 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900">Attendees</p>
                          <p className="text-gray-700 text-lg">
                            {booking.attendees} {booking.attendees === 1 ? 'person' : 'people'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start bg-gray-50 p-4 rounded-lg">
                        <MapPin className="w-6 h-6 text-orange-600 mr-4 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900">Location</p>
                          <p className="text-gray-700 text-lg">Conference Room</p>
                          <p className="text-gray-600 text-sm">Merritt House Coworking</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Details</h3>
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <p className="text-gray-700 mb-2">
                        <span className="font-semibold">Name:</span> {booking.customer_name}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-semibold">Email:</span> {booking.customer_email}
                      </p>
                    </div>
                  </div>

                  {booking.purpose && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Meeting Purpose</h3>
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <p className="text-gray-700">{booking.purpose}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Member Benefits & Next Steps */}
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <Star className="w-6 h-6 text-orange-600 mr-3" />
                      Member Benefits Applied
                    </h3>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                      <div className="text-center mb-4">
                        <div className="inline-flex items-center bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                          ✨ MEMBER EXCLUSIVE
                        </div>
                        <p className="text-3xl font-bold text-green-600 mb-1">FREE</p>
                        <p className="text-green-700 font-medium">No payment required</p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Member hours used:</span>
                          <span className="font-bold text-green-600">{booking.duration_hours}h</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Regular price:</span>
                          <span className="text-gray-500 line-through">${booking.duration_hours * 25}</span>
                        </div>
                        <div className="border-t border-green-300 pt-2 mt-3">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-gray-900">You saved:</span>
                            <span className="text-green-600">${booking.duration_hours * 25}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* What's Included */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">What's Included</h3>
                    <div className="space-y-3">
                      <div className="flex items-center bg-white p-3 rounded-lg border">
                        <Monitor className="w-5 h-5 text-green-600 mr-3" />
                        <span className="text-gray-700">65" Smart TV with HDMI/Wireless casting</span>
                      </div>
                      <div className="flex items-center bg-white p-3 rounded-lg border">
                        <Wifi className="w-5 h-5 text-green-600 mr-3" />
                        <span className="text-gray-700">High-speed WiFi & power outlets</span>
                      </div>
                      <div className="flex items-center bg-white p-3 rounded-lg border">
                        <Coffee className="w-5 h-5 text-green-600 mr-3" />
                        <span className="text-gray-700">Complimentary coffee & water</span>
                      </div>
                      <div className="flex items-center bg-white p-3 rounded-lg border">
                        <Users className="w-5 h-5 text-green-600 mr-3" />
                        <span className="text-gray-700">Professional meeting environment</span>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Status */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmations Sent</h3>
                    <div className="space-y-3">
                      <div className="flex items-center bg-green-50 p-3 rounded-lg border border-green-200">
                        <Mail className="w-5 h-5 text-green-600 mr-3" />
                        <span className="text-gray-700">Email confirmation sent to {booking.customer_email}</span>
                      </div>
                      {booking.calendar_event_created ? (
                        <div className="flex items-center bg-green-50 p-3 rounded-lg border border-green-200">
                          <Calendar className="w-5 h-5 text-green-600 mr-3" />
                          <span className="text-gray-700">Calendar invitation sent</span>
                        </div>
                      ) : (
                        <div className="flex items-center bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
                          <span className="text-gray-700">Calendar invite pending - check your email</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">What Happens Next?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">1. Check Your Email</h3>
              <p className="text-gray-600">
                You'll receive a detailed confirmation email with all your booking information and any calendar invitations.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">2. Add to Calendar</h3>
              <p className="text-gray-600">
                If you received a calendar invitation, accept it to automatically add the meeting to your calendar.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">3. Just Show Up!</h3>
              <p className="text-gray-600">
                Arrive a few minutes early and your room will be ready. The door will be unlocked during your reserved time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Need Anything Else?</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link 
              href="/member-resources/meeting-rooms" 
              className="bg-orange-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-orange-700 transition flex items-center justify-center group"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book Another Room
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              href="/member-resources/snackshop" 
              className="bg-green-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center group"
            >
              <Coffee className="w-5 h-5 mr-2" />
              Order Snacks
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              href="/member-resources" 
              className="bg-blue-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center group"
            >
              <Star className="w-5 h-5 mr-2" />
              Member Portal
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              href="/contact" 
              className="bg-white text-gray-700 border-2 border-gray-300 px-6 py-4 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center justify-center group"
            >
              <Phone className="w-5 h-5 mr-2" />
              Get Help
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <p className="text-gray-600 mb-2">
              <strong>Questions about your booking?</strong>
            </p>
            <p className="text-gray-600">
              Call us at <a href="tel:(303)359-8337" className="text-orange-600 hover:underline font-bold">(303) 359-8337</a> or 
              email <a href="mailto:support@merritthouse.net" className="text-orange-600 hover:underline font-bold">support@merritthouse.net</a>
            </p>
            <p className="text-sm text-gray-500 mt-2">We're here to help make your meeting successful!</p>
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
          <p className="text-gray-600 text-lg">Loading booking confirmation...</p>
        </div>
      </div>
    }>
      <MemberBookingSuccessContent />
    </Suspense>
  );
}