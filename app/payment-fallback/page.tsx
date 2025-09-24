// app/payment-fallback/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Clock, CreditCard, Phone, Mail } from 'lucide-react';
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
}

export default function PaymentFallbackPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId) {
      // In a real implementation, you might fetch booking details here
      // For now, we'll show a generic fallback page
      setLoading(false);
    } else {
      setError('No booking ID provided');
      setLoading(false);
    }
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-pulse text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <section className="bg-gradient-to-br from-yellow-50 to-orange-100 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-6" />
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Payment System Temporarily Unavailable
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Your booking has been created and your time slot is temporarily reserved.
          </p>
          <div className="inline-flex items-center bg-white px-6 py-3 rounded-full shadow-sm">
            <span className="text-sm font-medium text-gray-600 mr-2">Booking ID:</span>
            <span className="font-mono text-sm text-gray-900">{bookingId}</span>
          </div>
        </div>
      </section>

      {/* Payment Options */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-orange-50 px-6 py-4 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Complete Your Payment</h2>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left Column - Payment Options */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Options</h3>
                    <div className="space-y-4">
                      {/* Phone Payment */}
                      <div className="flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-orange-300 transition">
                        <Phone className="w-6 h-6 text-orange-600 mr-3 mt-1" />
                        <div>
                          <h4 className="font-semibold text-gray-900">Call to Pay</h4>
                          <p className="text-gray-600 text-sm mb-2">
                            Call us and we'll process your payment over the phone
                          </p>
                          <p className="font-bold text-orange-600">(303) 555-0123</p>
                          <p className="text-xs text-gray-500">Available: Mon-Fri 8 AM - 6 PM</p>
                        </div>
                      </div>

                      {/* Email Payment */}
                      <div className="flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-orange-300 transition">
                        <Mail className="w-6 h-6 text-orange-600 mr-3 mt-1" />
                        <div>
                          <h4 className="font-semibold text-gray-900">Email Payment Link</h4>
                          <p className="text-gray-600 text-sm mb-2">
                            We'll send you a secure payment link via email
                          </p>
                          <p className="font-bold text-orange-600">payments@merrittworkspace.net</p>
                          <p className="text-xs text-gray-500">Include your booking ID in the subject</p>
                        </div>
                      </div>

                      {/* Retry Online */}
                      <div className="flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-orange-300 transition">
                        <CreditCard className="w-6 h-6 text-orange-600 mr-3 mt-1" />
                        <div>
                          <h4 className="font-semibold text-gray-900">Try Online Payment Again</h4>
                          <p className="text-gray-600 text-sm mb-2">
                            Our online payment system may be working again
                          </p>
                          <Link 
                            href={`/member-resources/meeting-rooms?retry_payment=${bookingId}`}
                            className="inline-block bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-700 transition"
                          >
                            Retry Payment
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Booking Info */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Booking Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-2 text-sm">
                        <p><strong>Booking ID:</strong> {bookingId}</p>
                        <p><strong>Room:</strong> Conference Room</p>
                        <p><strong>Date:</strong> [Will be filled from booking details]</p>
                        <p><strong>Time:</strong> [Will be filled from booking details]</p>
                        <p><strong>Duration:</strong> [Will be filled from booking details]</p>
                        <div className="pt-2 border-t">
                          <p className="text-lg"><strong>Total Due: $[Amount]</strong></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                    <h4 className="font-semibold text-yellow-800 mb-2">Time Slot Reserved</h4>
                    <p className="text-yellow-700 text-sm">
                      Your time slot is temporarily reserved for <strong>2 hours</strong>. 
                      Please complete payment within this time to confirm your booking.
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Need Help?</h4>
                    <p className="text-blue-700 text-sm mb-3">
                      Our team is here to help you complete your booking.
                    </p>
                    <div className="space-y-1 text-sm text-blue-700">
                      <p><strong>Phone:</strong> (303) 555-0123</p>
                      <p><strong>Email:</strong> support@merrittworkspace.net</p>
                      <p><strong>Hours:</strong> Mon-Fri 8 AM - 6 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Important Notice</h2>
          <div className="bg-gray-50 p-6 rounded-lg max-w-2xl mx-auto">
            <p className="text-gray-700 mb-4">
              <strong>Your booking is not confirmed until payment is received.</strong>
            </p>
            <p className="text-gray-600 text-sm">
              If payment is not completed within 2 hours, your time slot will be released 
              and made available to other customers. We apologize for the inconvenience 
              and appreciate your patience.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}