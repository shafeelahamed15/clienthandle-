// Security configuration and utilities
import { NextResponse } from 'next/server';

// Content Security Policy
export const CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://checkout.razorpay.com https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https: http:;
  connect-src 'self' https://api.openai.com https://api.stripe.com https://api.razorpay.com https://*.supabase.co wss://*.supabase.co;
  media-src 'self' blob: data:;
  object-src 'none';
  base-uri 'self';
  frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://api.razorpay.com;
  frame-ancestors 'none';
  form-action 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

// Security headers configuration
export const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': CSP_HEADER,
  
  // Prevent XSS attacks
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent content type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Control framing (already in CSP, but adding for older browsers)
  'X-Frame-Options': 'DENY',
  
  // HTTPS Redirect and HSTS
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  
  // Hide server information
  'X-Powered-By': '',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy (Feature Policy)
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
} as const;

// Rate limiting configurations by endpoint
export const RATE_LIMITS = {
  // Authentication endpoints
  'auth:signin': { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  'auth:signup': { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  'auth:reset': { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  
  // AI endpoints
  'ai:compose': { limit: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  'ai:generate': { limit: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  
  // Data endpoints
  'api:clients': { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  'api:invoices': { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  'api:messages': { limit: 50, windowMs: 60 * 1000 }, // 50 requests per minute
  
  // Payment endpoints (more restrictive)
  'payment:create': { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  'payment:webhook': { limit: 100, windowMs: 60 * 1000 }, // 100 webhooks per minute
  
  // File operations
  'file:upload': { limit: 20, windowMs: 60 * 1000 }, // 20 uploads per minute
  'file:download': { limit: 100, windowMs: 60 * 1000 }, // 100 downloads per minute
  
  // General API
  'api:general': { limit: 200, windowMs: 60 * 1000 }, // 200 requests per minute
} as const;

// Enhanced rate limiter with sliding window
class SlidingWindowRateLimiter {
  private windows = new Map<string, number[]>();
  
  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const window = this.windows.get(key) || [];
    
    // Remove expired entries
    const validEntries = window.filter(timestamp => now - timestamp < windowMs);
    
    // Check if limit exceeded
    if (validEntries.length >= limit) {
      return false;
    }
    
    // Add current request
    validEntries.push(now);
    this.windows.set(key, validEntries);
    
    // Cleanup old windows periodically
    this.cleanup();
    
    return true;
  }
  
  private cleanup() {
    if (Math.random() < 0.01) { // 1% chance
      const now = Date.now();
      for (const [key, window] of this.windows.entries()) {
        const validEntries = window.filter(timestamp => now - timestamp < 60 * 60 * 1000); // Keep 1 hour
        if (validEntries.length === 0) {
          this.windows.delete(key);
        } else {
          this.windows.set(key, validEntries);
        }
      }
    }
  }
  
  getRemainingAttempts(key: string, limit: number, windowMs: number): number {
    const now = Date.now();
    const window = this.windows.get(key) || [];
    const validEntries = window.filter(timestamp => now - timestamp < windowMs);
    return Math.max(0, limit - validEntries.length);
  }
  
  getResetTime(key: string, windowMs: number): number {
    const window = this.windows.get(key) || [];
    if (window.length === 0) return 0;
    
    const oldestEntry = Math.min(...window);
    return oldestEntry + windowMs;
  }
}

// Global rate limiter instance
const rateLimiter = new SlidingWindowRateLimiter();

// Rate limiting middleware
export async function applyRateLimit(
  identifier: string, 
  operation: keyof typeof RATE_LIMITS,
  customLimit?: { limit: number; windowMs: number }
): Promise<{ success: boolean; remaining: number; resetTime: number; error?: string }> {
  const config = customLimit || RATE_LIMITS[operation];
  const key = `${operation}:${identifier}`;
  
  const allowed = rateLimiter.isAllowed(key, config.limit, config.windowMs);
  const remaining = rateLimiter.getRemainingAttempts(key, config.limit, config.windowMs);
  const resetTime = rateLimiter.getResetTime(key, config.windowMs);
  
  if (!allowed) {
    const resetInSeconds = Math.ceil((resetTime - Date.now()) / 1000);
    return {
      success: false,
      remaining: 0,
      resetTime,
      error: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`
    };
  }
  
  return {
    success: true,
    remaining,
    resetTime
  };
}

// Apply security headers to response
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    } else {
      response.headers.delete(key);
    }
  });
  
  return response;
}

// Validate request origin (CSRF protection)
export function validateOrigin(request: Request, allowedOrigins: string[]): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  if (!origin && !referer) return false; // Require origin or referer
  
  const requestOrigin = origin || (referer ? new URL(referer).origin : null);
  return requestOrigin ? allowedOrigins.includes(requestOrigin) : false;
}

// Input sanitization helpers
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"&]/g, (match) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match] || match;
    });
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Phone validation
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// UUID validation
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// IP address helpers
export function getClientIP(request: Request): string {
  // Check various headers in order of preference
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }
  
  return 'unknown';
}

// Hash IP address for privacy
export function hashIP(ip: string): string {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Use Web Crypto API in browser/edge runtime
    return btoa(ip); // Simple base64 encoding for now
  }
  
  // Fallback for Node.js environment
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

// Security audit logging
export interface SecurityEvent {
  type: 'rate_limit' | 'invalid_origin' | 'suspicious_request' | 'auth_failure';
  userId?: string;
  ip: string;
  userAgent?: string;
  details: Record<string, unknown>;
  timestamp: string;
}

const securityEvents: SecurityEvent[] = [];

export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const securityEvent: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString()
  };
  
  // In production, this would be sent to a logging service
  console.warn('🚨 Security Event:', securityEvent);
  
  // Store in memory for development (in production, use persistent storage)
  securityEvents.push(securityEvent);
  
  // Keep only last 1000 events
  if (securityEvents.length > 1000) {
    securityEvents.splice(0, securityEvents.length - 1000);
  }
}

// Get recent security events (for admin dashboard)
export function getSecurityEvents(limit: number = 100): SecurityEvent[] {
  return securityEvents.slice(-limit).reverse();
}

export type { SecurityEvent };
export { rateLimiter };