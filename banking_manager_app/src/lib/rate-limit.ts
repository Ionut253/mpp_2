import rateLimit from 'express-rate-limit';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Store for rate limiting
const rateLimitStore = new Map();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

export function createRateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes by default
    max = 100 // 100 requests per windowMs by default
  } = options;

  return async function rateLimit(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') ||
               'unknown';
    
    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();

    let rateLimitInfo = rateLimitStore.get(key);

    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      rateLimitInfo = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    rateLimitInfo.count++;
    rateLimitStore.set(key, rateLimitInfo);

    const remaining = Math.max(0, max - rateLimitInfo.count);
    const reset = Math.ceil((rateLimitInfo.resetTime - now) / 1000);

    // Set rate limit headers
    const headers = new Headers({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString()
    });

    if (rateLimitInfo.count > max) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later.' },
        { 
          status: 429,
          headers
        }
      );
    }

    // Continue with the request
    const response = NextResponse.next();
    
    // Add rate limit headers to the response
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

// Create common rate limiters
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 requests per 15 minutes
});

export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30 // 30 requests per minute
}); 