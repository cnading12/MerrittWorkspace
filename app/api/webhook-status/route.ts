import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    webhook_endpoint: '/api/webhooks/meeting-rooms',
    status: 'active',
    environment_check: {
      stripe_secret_key: process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING',
      stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING',
      base_url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    },
    webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhooks/meeting-rooms`,
    required_events: [
      'checkout.session.completed',
      'payment_intent.succeeded', 
      'payment_intent.payment_failed',
      'checkout.session.expired'
    ],
    timestamp: new Date().toISOString()
  });
}