// app/api/member-hours/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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

    return NextResponse.json({
      memberHours,
      member: {
        id: member.id,
        email: member.email,
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