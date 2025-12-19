// app/api/test-email/route.ts - TEST ENDPOINT (PROTECTED)
import { NextRequest, NextResponse } from 'next/server';
import { sendMemberBookingConfirmationEmail } from '@/lib/resend';
import { meetingRoomAPI } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Only allow in development or with admin secret
    const isDev = process.env.NODE_ENV === 'development';
    const adminSecret = process.env.ADMIN_API_SECRET;
    const providedSecret = request.headers.get('x-admin-secret');

    if (!isDev && (!adminSecret || providedSecret !== adminSecret)) {
      return NextResponse.json(
        { error: 'This endpoint is disabled in production' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');

    if (!bookingId) {
      return NextResponse.json({
        error: 'Please provide booking_id query parameter'
      }, { status: 400 });
    }

    console.log('🧪 Testing email sending for booking:', bookingId);

    // Get the booking
    const booking = await meetingRoomAPI.getBooking(bookingId);
    
    if (!booking) {
      return NextResponse.json({
        error: 'Booking not found',
        booking_id: bookingId
      }, { status: 404 });
    }

    console.log('📋 Booking found:', {
      id: booking.id,
      customer: booking.customer_name,
      email: booking.customer_email,
      status: booking.status,
      payment_status: booking.payment_status,
      is_member: booking.is_member_booking
    });

    // Check if RESEND_API_KEY is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        error: 'RESEND_API_KEY not configured in environment variables',
        booking: booking,
        action: 'Please add RESEND_API_KEY to your .env.local file'
      }, { status: 500 });
    }

    console.log('📧 Attempting to send confirmation email...');
    console.log('📧 Email will be sent to:', booking.customer_email);
    console.log('📧 Manager email configured as: manager@merrittworkspace.net');

    // Try to send the email
    const emailResult = await sendMemberBookingConfirmationEmail({
      to: booking.customer_email,
      customerName: booking.customer_name,
      booking: booking,
      roomName: 'Conference Room',
      isMemberBooking: booking.is_member_booking || false,
      memberHoursUsed: booking.is_member_booking ? booking.duration_hours : 0,
      remainingHours: undefined,
      memberInfo: undefined
    });

    console.log('✅ Email sent successfully:', emailResult);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully!',
      booking: {
        id: booking.id,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        is_member_booking: booking.is_member_booking
      },
      email_result: {
        customer_email_id: emailResult.customerEmail?.data?.id || 'unknown',
        manager_email_id: emailResult.managerEmail?.data?.id || 'unknown'
      },
      resend_configured: !!process.env.RESEND_API_KEY
    });

  } catch (error) {
    console.error('❌ Email test failed:', error);

    // SECURITY: Don't expose error details or stack traces
    return NextResponse.json({
      error: 'Email sending failed'
    }, { status: 500 });
  }
}