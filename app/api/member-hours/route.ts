// app/api/member-hours/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple in-memory rate limiter (per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limiting to prevent enumeration attacks
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { email, verification_token } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // SECURITY: Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get current date for monthly calculations
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // First, check if the email belongs to a member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, email, membership_type, monthly_meeting_hours, status')
      .eq('email', email.toLowerCase())
      .eq('status', 'active')
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'No active membership found for this email address' },
        { status: 404 }
      );
    }

    // Get member's used hours for the current month
    const { data: usedHours, error: usedHoursError } = await supabase
      .from('bookings')
      .select('duration_hours')
      .eq('customer_email', email.toLowerCase())
      .eq('is_member_booking', true)
      .neq('status', 'cancelled')
      .gte('booking_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('booking_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

    if (usedHoursError) {
      console.error('Error fetching used hours:', usedHoursError);
      return NextResponse.json(
        { error: 'Failed to fetch member hours data' },
        { status: 500 }
      );
    }

    // Calculate total used hours
    const totalUsedHours = usedHours?.reduce((sum, booking) => sum + booking.duration_hours, 0) || 0;

    // Calculate remaining hours
    const remainingHours = Math.max(0, member.monthly_meeting_hours - totalUsedHours);

    const memberHours = {
      total_hours: member.monthly_meeting_hours,
      used_hours: totalUsedHours,
      remaining_hours: remainingHours,
      membership_type: member.membership_type
    };

    // SECURITY: Return limited information - don't expose member ID or full details
    return NextResponse.json({
      memberHours,
      member: {
        membership_type: member.membership_type,
        status: member.status
      }
    });

  } catch (error) {
    console.error('Member hours API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}