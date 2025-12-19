// lib/auth.ts - Security utilities for API authentication and input validation
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// ============================================================================
// ADMIN API AUTHENTICATION
// ============================================================================

/**
 * Validates the admin API secret from request headers.
 * Expects header: x-admin-api-secret: <ADMIN_API_SECRET>
 */
export function validateAdminAuth(request: NextRequest): { valid: boolean; error?: string } {
  const adminSecret = process.env.ADMIN_API_SECRET;

  if (!adminSecret) {
    console.error('ADMIN_API_SECRET not configured in environment variables');
    return { valid: false, error: 'Server configuration error' };
  }

  const providedSecret = request.headers.get('x-admin-api-secret');

  if (!providedSecret) {
    return { valid: false, error: 'Missing authentication header' };
  }

  // Use constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(providedSecret, adminSecret)) {
    return { valid: false, error: 'Invalid authentication credentials' };
  }

  return { valid: true };
}

/**
 * Creates a standardized unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  // Standard email regex that covers most valid email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates phone number format (US formats)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Check for valid US phone number (10 or 11 digits with country code)
  return /^(\+?1)?[2-9]\d{9}$/.test(cleaned);
}

/**
 * Validates string length is within bounds
 */
export function isValidLength(str: string, min: number, max: number): boolean {
  if (typeof str !== 'string') return false;
  return str.length >= min && str.length <= max;
}

/**
 * Sanitizes string input - removes dangerous characters for logging/display
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';

  return input
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

/**
 * Escapes HTML entities to prevent XSS in email templates
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';

  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return str.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Validates and sanitizes URL to prevent injection attacks
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Validates date string format (YYYY-MM-DD)
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validates time string format (HH:MM)
 */
export function isValidTime(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(timeStr);
}

/**
 * Validates a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Validates a non-negative number
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

// ============================================================================
// RATE LIMITING (Simple in-memory implementation)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (for production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Simple rate limiter
 * @param identifier - Unique identifier (IP, email, etc.)
 * @param limit - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate:${identifier}`;

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: entry.resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Creates a rate limit exceeded response
 */
export function rateLimitExceededResponse(resetTime: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000))
      }
    }
  );
}

/**
 * Gets client IP from request
 */
export function getClientIP(request: NextRequest): string {
  // Check for forwarded IP (behind proxy/load balancer)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}

// ============================================================================
// BOOKING AUTHORIZATION (Token-based for cancel/modify operations)
// ============================================================================

/**
 * Generates a simple hash-based token for booking operations
 * In production, use proper JWT or signed tokens
 */
export function generateBookingToken(bookingId: string, email: string): string {
  const secret = process.env.ADMIN_API_SECRET || 'fallback-secret';
  const data = `${bookingId}:${email}:${secret}`;

  // Simple hash - in production use crypto.createHmac
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
}

/**
 * Validates a booking token
 */
export function validateBookingToken(
  token: string,
  bookingId: string,
  email: string
): boolean {
  const expectedToken = generateBookingToken(bookingId, email);
  return constantTimeCompare(token, expectedToken);
}
