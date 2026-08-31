"use client";

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Monitor, Wifi, Coffee, MapPin, CheckCircle, XCircle, Loader2, AlertCircle, CreditCard, Gift, Sparkles } from 'lucide-react';
import Footer from '@/components/Footer';
import Link from 'next/link';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';
import MoreQuestions from '@/components/marketing/MoreQuestions';
import { formatTime, calculateEndTime } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { prepareIdUpload, describeUploadFailure } from '@/lib/portal/idUpload';
import { MAX_ID_FILE_BYTES, MAX_ID_FILE_LABEL } from '@/lib/portal/trialApplication';

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

interface TimeSlot {
  time_slot: string;
  is_available: boolean;
}

interface MemberLite {
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  company_name: string | null;
}

interface HoursSummary {
  included: number;
  used: number;
  remaining: number;
  // Present when the hours are an office-wide shared pool (private offices
  // can have multiple occupants who all draw from one allotment).
  pooled?: boolean;
  office_number?: string;
}

const HOURLY_RATE = 25; // Conference room rate per hour
const ROOM_CAPACITY = 8; // Max attendees

// Error Display Component
const ErrorDisplay = ({ error }: { error: string | null }) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 p-4 mb-6">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-red-700 font-medium">Booking Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    </div>
  );
};

// Success Message Component
const SuccessMessage = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="bg-green-50 border border-green-200 p-4 mb-6">
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

// Loading State Component
const LoadingState = ({ message }: { message: string }) => (
  <div className="text-center py-8">
    <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
    <p className="text-ink-60">{message}</p>
    <p className="text-sm text-ink-60 mt-2">This may take a few moments...</p>
  </div>
);

export default function MeetingRoomsPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [showBookingOptions, setShowBookingOptions] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  // Non-members must attach a photo ID (same requirement members satisfy in
  // the portal documents flow). Oversized photos are re-encoded in the
  // browser first; the cap that remains is the shared MAX_ID_FILE_BYTES.
  const [idFile, setIdFile] = useState<File | null>(null);

  // Member context (null = guest). When signed in, identity is pulled from the
  // profile and the member gets their tiered included hours.
  const [member, setMember] = useState<MemberLite | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hours, setHours] = useState<HoursSummary | null>(null);

  useEffect(() => {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setBookingForm(prev => ({ ...prev, date: today }));
  }, []);

  // Detect a portal session and prefill identity. The included-hours summary
  // loads in the effect below once we have a token and a selected date.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const meRes = await fetch('/api/portal/me', { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!mounted) return;
        if (meRes.ok) {
          const data = await meRes.json();
          const m: MemberLite = data.member;
          if (m) {
            setMember(m);
            setToken(session.access_token);
            setBookingForm(prev => ({
              ...prev,
              name: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim(),
              email: m.email ?? '',
              phone: m.phone ?? '',
              company: m.company_name ?? '',
              bookingType: 'member',
            }));
          }
        }
      } catch {
        // Treat any failure as a guest — the guest flow always works.
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Included hours are a per-calendar-month allotment, so the summary is
  // fetched for the month of the selected booking date — booking three weeks
  // out shows (and draws from) that month's remaining hours, which already
  // reflect any other future bookings.
  const refreshMemberHours = async (authToken?: string | null, forDate?: string) => {
    const t = authToken ?? token;
    if (!t) return;
    try {
      const qs = forDate ? `?date=${forDate}` : '';
      const res = await fetch(`/api/bookings/member${qs}`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const h = await res.json();
        setHours({
          included: h.included,
          used: h.used,
          remaining: h.remaining,
          pooled: h.pooled,
          office_number: h.office_number,
        });
      }
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    if (token) refreshMemberHours(token, selectedDate || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedDate]);

  // "this month" vs the named month when the selected date falls in a later
  // month — the allotment shown is the one that date's booking draws from.
  const hoursMonthLabel = (() => {
    if (!selectedDate) return 'this month';
    const nowMonth = new Date().toISOString().slice(0, 7);
    if (selectedDate.slice(0, 7) === nowMonth) return 'this month';
    const [y, m] = selectedDate.split('-').map(Number);
    return `in ${new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' })}`;
  })();

  // Free vs billable split for the currently-selected duration.
  const memberCost = (() => {
    if (!member || !hours) return null;
    const included = Math.max(0, Math.min(bookingForm.duration, hours.remaining));
    const billed = Math.max(0, bookingForm.duration - included);
    return { included, billed, billedDollars: billed * HOURLY_RATE };
  })();

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  const loadAvailableSlots = async () => {
    if (!selectedDate) return;

    setLoadingSlots(true);
    setError(null);

    try {
      console.log('📅 Loading availability from Google Calendar for:', selectedDate);

      const response = await fetch(`/api/availability?date=${selectedDate}`);
      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Availability loaded from Google Calendar:', {
          total: data.total_slots,
          available: data.available_slots,
          booked: data.booked_times
        });
        setAvailableSlots(data.time_slots);

        if (data.booked_times && data.booked_times.length > 0) {
          console.log('🚫 Booked times:', data.booked_times.join(', '));
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

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    // Members skip the member-vs-paid chooser: their booking handles included
    // hours and any overage automatically.
    setBookingForm(prev => ({ ...prev, time, bookingType: member ? 'member' : prev.bookingType }));
    setShowBookingOptions(true);
    setShowBookingForm(Boolean(member));
    setError(null);
  };

  const handleDurationChange = (duration: number) => {
    setBookingForm(prev => ({ ...prev, duration }));
  };

  const handleBookingTypeSelection = (type: 'member' | 'paid') => {
    setBookingForm(prev => ({ ...prev, bookingType: type }));
    setShowBookingForm(true);
  };

  const calculatePrice = (duration: number) => {
    return HOURLY_RATE * duration;
  };

  const resetAfterBooking = () => {
    setShowBookingForm(false);
    setShowBookingOptions(false);
    setSelectedTime('');
    setBookingForm(prev => ({ ...prev, purpose: '' }));
    loadAvailableSlots();
  };

  // Authenticated member booking: included hours are free, overage is charged
  // to the card on file (or hosted-checkout fallback).
  const handleMemberBooking = async () => {
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/bookings/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          booking_date: selectedDate,
          start_time: selectedTime,
          duration_hours: bookingForm.duration,
          attendees: bookingForm.attendees,
          purpose: bookingForm.purpose || '',
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to create booking');

      // Overage with no saved card / 3DS: go pay on hosted Checkout.
      if (data.requires_checkout && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      // Fully covered by included hours: nice member success page.
      if (data.free && data.redirect_to) {
        window.location.href = data.redirect_to;
        return;
      }
      // Overage charged to the card on file in one click.
      if (data.charged) {
        const billed = (data.charged_cents / 100).toFixed(2);
        setSuccessMessage(`Booking confirmed! ${data.included_hours} included hour${data.included_hours === 1 ? '' : 's'} + ${data.billed_hours} hour${data.billed_hours === 1 ? '' : 's'} over your allotment at $${HOURLY_RATE}/hr = $${billed} charged to your card on file. A calendar invite and receipt are on the way.`);
        await refreshMemberHours(token, selectedDate || undefined);
        resetAfterBooking();
        return;
      }
      if (data.redirect_to) {
        window.location.href = data.redirect_to;
        return;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create booking. Please try again.';
      setError(errorMessage.includes('available')
        ? 'This time slot is no longer available. Please select a different time.'
        : errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    // Signed-in members use the authenticated booking flow.
    if (member && bookingForm.bookingType === 'member') {
      return handleMemberBooking();
    }

    // Guests must attach a photo ID before we hold the slot.
    if (bookingForm.bookingType === 'paid' && !idFile) {
      setError('Please attach a photo of your government-issued ID to book as a non-member.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const endTime = calculateEndTime(selectedTime, bookingForm.duration);
      const totalAmount = bookingForm.bookingType === 'member' ? 0 : calculatePrice(bookingForm.duration);

      // Prepare booking data. Sent as multipart form data so the ID photo
      // rides along with the booking fields.
      const bookingPayload = new FormData();
      bookingPayload.append('customer_name', bookingForm.name);
      bookingPayload.append('customer_email', bookingForm.email);
      bookingPayload.append('customer_phone', bookingForm.phone || '');
      bookingPayload.append('company', bookingForm.company || '');
      bookingPayload.append('booking_date', selectedDate);
      bookingPayload.append('start_time', selectedTime);
      bookingPayload.append('duration_hours', String(bookingForm.duration));
      bookingPayload.append('attendees', String(bookingForm.attendees));
      bookingPayload.append('purpose', bookingForm.purpose || '');
      bookingPayload.append('is_member_booking', String(bookingForm.bookingType === 'member'));

      // Add payment info only for paid bookings
      if (bookingForm.bookingType !== 'member') {
        bookingPayload.append('room_id', 'conference-room'); // Static ID since we only have one room
        bookingPayload.append('total_amount', String(totalAmount));
        // Shrunk before it is sent, like the trial form's photo ID. A
        // booking that dies on the platform's request-body limit reports
        // itself as a dead connection, which reads as "the booking system is
        // down" rather than "that photo is too big".
        if (idFile) {
          let prepared = idFile;
          try {
            prepared = await prepareIdUpload(idFile);
          } catch {
            prepared = idFile;
          }
          if (prepared.size > MAX_ID_FILE_BYTES) {
            throw new Error(
              `That photo ID is ${(prepared.size / (1024 * 1024)).toFixed(1)}MB, and the limit ` +
                `is ${MAX_ID_FILE_LABEL}. Please attach a smaller photo or scan.`
            );
          }
          bookingPayload.append('id_document', prepared);
        }
      }

      console.log('Submitting booking for:', bookingForm.email);

      // Create booking via API route (no Content-Type header — the browser
      // sets the multipart boundary itself)
      const response = await fetch('/api/bookings', {
        method: 'POST',
        body: bookingPayload,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Failed to create booking (HTTP ${response.status})`);
      }

      console.log('Booking response:', data);

      if (bookingForm.bookingType === 'member') {
        // For member bookings, redirect to success page
        if (data.redirect_to) {
          window.location.href = data.redirect_to;
        } else {
          setSuccessMessage(`🎉 Member booking confirmed! 

✅ Booking ID: ${data.booking.id}
📅 Date: ${new Date(selectedDate).toLocaleDateString()}
⏰ Time: ${selectedTime} - ${endTime}
⌛ Duration: ${bookingForm.duration} hour${bookingForm.duration > 1 ? 's' : ''}
👥 Attendees: ${bookingForm.attendees}

📧 A confirmation email has been sent to ${bookingForm.email}

✨ Your conference room is ready to go!`);
        }
      } else {
        // For paid bookings, redirect to Stripe checkout
        if (data.checkout_url) {
          console.log('Redirecting to Stripe checkout:', data.checkout_url);
          setSuccessMessage(`Creating payment session... 

Booking ID: ${data.booking.id}
Total: $${totalAmount.toFixed(2)}

You will be redirected to secure payment in a moment.`);

          setTimeout(() => {
            window.location.href = data.checkout_url;
          }, 2000);
          return;
        } else if (data.fallback) {
          setError(`Booking created but payment system is currently unavailable. 

Booking ID: ${data.booking.id}
Please contact us to complete payment: (303) 359-8337

Your time slot is temporarily reserved.`);
          return;
        }
      }

      // Reset form
      setShowBookingForm(false);
      setShowBookingOptions(false);
      setSelectedTime('');
      setIdFile(null);
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
      // describeUploadFailure passes a normal error straight through and only
      // rewrites the case that has no response to read — a request the
      // platform killed, whose message is "Load failed" or "Failed to fetch".
      const errorMessage = describeUploadFailure(error, idFile);

      if (errorMessage.includes('conflicts')) {
        setError('This time slot is no longer available. Please select a different time.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bone">
      {/* No pt-20: the hero starts at y=0 under the transparent navbar.
          This route is listed in HERO_ROUTES in Navbar.tsx. */}
      <PageHero
        src="/images/conference-room/empty.webp"
        alt="The glass-walled conference room at Merritt Workspace, with a 75-inch screen and seating for eight, in Sloan's Lake, Denver"
        blurDataURL={BLUR['conference-room/empty']}
        objectPosition="50% 55%"
        eyebrow="Member resources"
        title={<>The conference room.</>}
        lead="Seats eight, with a 75-inch screen, conference calling and fast WiFi. Members book against the credit their membership already includes; everyone else books by the hour."
      />

      {/* Error and Success Display */}
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
      <section className="py-16 bg-bone">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink mb-6">Member Benefits</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Gift className="w-6 h-6 text-orange-600 mr-3" />
                  <span className="text-lg">Included hours every month with your membership</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  <span className="text-lg">One-click booking — nothing to re-enter</span>
                </div>
                <div className="flex items-center">
                  <CreditCard className="w-6 h-6 text-blue-600 mr-3" />
                  <span className="text-lg">Easy online payment for guests &amp; trial days</span>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-6">
              <h3 className="font-display text-xl font-semibold text-orange-900 mb-4">Pricing</h3>
              <div className="space-y-2">
                <p className="text-orange-800">
                  <strong>Members:</strong> included hours each month
                </p>
                <p className="text-sm text-orange-700">
                  Dedicated desk: 4 hrs · Private office: 14–20 hrs / month. Extra time billed at ${HOURLY_RATE}/hr.
                </p>
                <p className="text-orange-800 pt-1">
                  <strong>Guests &amp; non-members:</strong> ${HOURLY_RATE}/hour
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
      <section className="py-16 bg-linen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-center text-ink mb-12">Book Your Conference Room</h2>

          {/* Date Selection */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-ink mb-4">Select Date</label>
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
              className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="mb-8">
              <label className="block text-lg font-semibold text-ink mb-4">Available Time Slots</label>

              {loadingSlots ? (
                <LoadingState message="Loading available times from Google Calendar..." />
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
                        className={`p-3  border-2 font-medium transition ${
                          !is_available
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
                  <p className="text-ink-60">No time slots available for this date.</p>
                </div>
              )}
            </div>
          )}

          {/* Booking Type Selection */}
          {showBookingOptions && (
            <div className="mb-8">
              {member ? (
                /* Signed-in member: one unified booking. Included hours are
                   free; overage is charged to the card on file. */
                <div className="mb-2">
                  <h3 className="font-display text-xl font-semibold text-ink mb-4">Your Member Booking</h3>
                  <div className="p-6 border-2 border-green-500 bg-green-50">
                    <div className="flex items-center mb-3">
                      <Sparkles className="w-7 h-7 text-green-600 mr-3" />
                      <h4 className="text-lg font-semibold text-ink">
                        Booking as {bookingForm.name || member.email}
                      </h4>
                    </div>
                    {hours ? (
                      <p className="text-sm text-green-800 mb-3">
                        {hours.pooled ? (
                          <>
                            Your office has <strong>{hours.remaining}</strong> of{' '}
                            {hours.included} included hour{hours.included === 1 ? '' : 's'} left {hoursMonthLabel} — shared by
                            everyone in Office {hours.office_number}.
                          </>
                        ) : (
                          <>
                            You have <strong>{hours.remaining}</strong> of {hours.included} included hour{hours.included === 1 ? '' : 's'} left {hoursMonthLabel}.
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-green-800 mb-3">Loading your included hours…</p>
                    )}
                    {memberCost && (
                      <div className="bg-bone/70 p-3 border border-green-200">
                        {memberCost.billed === 0 ? (
                          <p className="text-green-800 font-medium">
                            ✓ Free — covered by your included hours ({memberCost.included} hr{memberCost.included === 1 ? '' : 's'})
                          </p>
                        ) : (
                          <>
                            <p className="text-ink font-medium">
                              {memberCost.included} hr{memberCost.included === 1 ? '' : 's'} included
                              {' + '}{memberCost.billed} hr{memberCost.billed === 1 ? '' : 's'} over {hours?.pooled ? "your office's" : 'your'} allotment
                            </p>
                            <p className="text-orange-700 font-semibold mt-1">
                              ${memberCost.billedDollars.toFixed(2)} charged to your card on file
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Guest: keep the two-card chooser, but the member card now
                   nudges sign-in instead of offering a free-for-all booking. */
                <>
                  <h3 className="font-display text-xl font-semibold text-ink mb-6">Choose Booking Type</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Member sign-in nudge */}
                    <Link
                      href="/portal/login"
                      className="block p-6 border border-clay hover:border-green-400 transition"
                    >
                      <div className="flex items-center mb-4">
                        <Gift className="w-8 h-8 text-green-600 mr-3" />
                        <h4 className="text-lg font-semibold text-ink">Member Booking</h4>
                      </div>
                      <p className="text-ink-60 mb-4">
                        Members get included hours each month and book in one click — no
                        re-typing, no fees on included time.
                      </p>
                      <div className="bg-green-100 p-3">
                        <p className="text-green-800 font-medium">Sign in to book with your hours →</p>
                        <p className="text-sm text-green-700 mt-1">Already a member? Move your account online.</p>
                      </div>
                    </Link>

                    {/* Paid Booking */}
                    <div
                      className={`p-6 border-2  cursor-pointer transition ${
                        bookingForm.bookingType === 'paid'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                      onClick={() => handleBookingTypeSelection('paid')}
                    >
                      <div className="flex items-center mb-4">
                        <CreditCard className="w-8 h-8 text-orange-600 mr-3" />
                        <h4 className="text-lg font-semibold text-ink">Pay Online</h4>
                      </div>
                      <p className="text-ink-60 mb-4">
                        Guest, tour, or trial day? Pay securely online — no account needed.
                      </p>
                      <div className="bg-orange-100 p-3">
                        <p className="text-orange-800 font-medium">${calculatePrice(bookingForm.duration)} total</p>
                        <p className="text-sm text-orange-700">Duration: {bookingForm.duration} hour{bookingForm.duration > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Duration Selection */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-ink-60 mb-2">Duration (hours)</label>
                <select
                  value={bookingForm.duration}
                  onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                  className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
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
            <div className="bg-bone p-6 border">
              <h3 className="font-display text-xl font-semibold text-ink mb-6">
                {bookingForm.bookingType === 'member' ? 'Complete Member Booking' : 'Complete Payment Booking'}
              </h3>

              <form onSubmit={handleSubmitBooking} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      readOnly={Boolean(member)}
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full p-3 border border-clay  focus:ring-2 focus:ring-orange-500 ${member ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      readOnly={Boolean(member)}
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full p-3 border border-clay  focus:ring-2 focus:ring-orange-500 ${member ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                  </div>

                  {bookingForm.bookingType === 'paid' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-ink-60 mb-2">Company</label>
                        <input
                          type="text"
                          value={bookingForm.company}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, company: e.target.value }))}
                          className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-ink-60 mb-2">Phone</label>
                        <input
                          type="tel"
                          value={bookingForm.phone}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-ink-60 mb-2">Photo ID *</label>
                        <input
                          type="file"
                          required
                          accept="image/*,.pdf"
                          onChange={async (e) => {
                            const picked = e.target.files?.[0] || null;
                            if (!picked) {
                              setIdFile(null);
                              return;
                            }
                            // Shrink here rather than rejecting here. The old
                            // check turned away any phone photo over 10MB
                            // that re-encoding brings under 4MB in a second,
                            // and passed through everything between 4.5 and
                            // 10MB — which the platform then dropped without
                            // a message.
                            let prepared = picked;
                            try {
                              prepared = await prepareIdUpload(picked);
                            } catch {
                              prepared = picked;
                            }
                            if (prepared.size > MAX_ID_FILE_BYTES) {
                              setError(
                                `That ID is ${(prepared.size / (1024 * 1024)).toFixed(1)}MB, and the ` +
                                  `limit is ${MAX_ID_FILE_LABEL}. Please choose a smaller photo or scan.`
                              );
                              setIdFile(null);
                              e.target.value = '';
                              return;
                            }
                            setError(null);
                            setIdFile(prepared);
                          }}
                          className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500 file:mr-3 file:py-1.5 file:px-3 file: file:border-0 file:bg-orange-100 file:text-orange-800 file:font-medium hover:file:bg-orange-200"
                        />
                        <p className="text-xs text-ink-60 mt-1">
                          A photo of your government-issued ID (driver's license or passport) is
                          required for non-member bookings. Large photos are shrunk
                          automatically before they are sent.
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">Number of Attendees</label>
                    <select
                      value={bookingForm.attendees}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, attendees: parseInt(e.target.value) }))}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    >
                      {Array.from({ length: ROOM_CAPACITY }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} {num === 1 ? 'person' : 'people'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Meeting Purpose</label>
                  <textarea
                    rows={3}
                    value={bookingForm.purpose}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Brief description of your meeting (optional)"
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Booking Summary */}
                <div className="bg-linen p-4 border">
                  <h4 className="font-semibold text-ink mb-2">Booking Summary</h4>
                  <div className="space-y-1 text-sm text-ink-60">
                    <p><strong>Room:</strong> Conference Room</p>
                    <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {formatTime(selectedTime)} - {formatTime(calculateEndTime(selectedTime, bookingForm.duration))}</p>
                    <p><strong>Duration:</strong> {bookingForm.duration} hour{bookingForm.duration > 1 ? 's' : ''}</p>
                    <p><strong>Type:</strong> {member ? 'Member Booking' : 'Paid Booking'}</p>
                    {member && memberCost && memberCost.billed > 0 && (
                      <p className="text-xs text-ink-60">
                        {memberCost.included} hr included · {memberCost.billed} hr @ ${HOURLY_RATE}/hr
                      </p>
                    )}
                    <p className="text-lg font-semibold text-orange-600 pt-2">
                      Total: {member
                        ? (memberCost
                            ? (memberCost.billed === 0 ? 'FREE (included)' : `$${memberCost.billedDollars.toFixed(2)}`)
                            : '—')
                        : `$${calculatePrice(bookingForm.duration)}`}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-orange-600 text-white py-4 px-6 font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Creating Booking...
                    </>
                  ) : member ? (
                    memberCost && memberCost.billed > 0
                      ? `Confirm & Pay $${memberCost.billedDollars.toFixed(2)}`
                      : 'Confirm Booking'
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
      <section className="py-16 bg-bone">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-center text-ink mb-12">What's Included</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <Monitor className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">75" Smart TV</h3>
              <p className="text-ink-60">Present wirelessly or via HDMI with crystal clear 4K display</p>
            </div>

            <div className="text-center">
              <Wifi className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">High-Speed WiFi</h3>
              <p className="text-ink-60">Reliable internet for video calls and online presentations</p>
            </div>

            <div className="text-center">
              <Users className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">Seats up to {ROOM_CAPACITY}</h3>
              <p className="text-ink-60">Comfortable seating for small to medium team meetings</p>
            </div>

            <div className="text-center">
              <Coffee className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">Refreshments</h3>
              <p className="text-ink-60">Access to our snackshop for coffee and light refreshments</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink mb-4">Need Help or Have Questions?</h2>
          <p className="text-ink-60 mb-6">
            Our team is here to help you have a successful meeting experience.
          </p>
          <Link href="/contact" className="bg-orange-600 text-white px-6 py-3 font-semibold hover:bg-orange-700 transition inline-block">
            Contact Us
          </Link>
        </div>
      </section>

      <MoreQuestions
        lead="Something the page above didn’t cover?"
        hash="conference-rooms"
      />

      <Footer />
    </div>
  );
}