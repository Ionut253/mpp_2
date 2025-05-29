import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { authRateLimit, apiRateLimit } from '@/lib/rate-limit';

// Secret key for JWT verification - in production, use a proper secret from environment variables
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/login_page',
  '/register_page',
  '/'
];

// CSRF protection: allowed origins
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.NEXT_PUBLIC_APP_URL,
  'https://mpp-2-chi.vercel.app/', 
  /^https:\/\/[^.]+\.vercel\.app$/
].filter(Boolean);

// Helper function to add CORS headers to responses
function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const origin = request.headers.get('origin');

  // CORS and CSRF protection for API routes
  if (path.startsWith('/api/')) {
    // Check origin for CSRF protection
    if (origin) {
      const isAllowed = ALLOWED_ORIGINS.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return allowedOrigin === origin;
        }
        // Check if it matches a regex pattern
        if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });

      if (!isAllowed) {
        return addCorsHeaders(NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        ), origin);
      }
    }

    // For preflight OPTIONS requests, return CORS headers
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      return addCorsHeaders(response, origin);
    }

    // Apply rate limiting
    const rateLimit = path.startsWith('/api/auth/')
      ? authRateLimit
      : apiRateLimit;

    const rateLimitResponse = await rateLimit(request);
    if (rateLimitResponse.status === 429) {
      return addCorsHeaders(rateLimitResponse, origin);
    }
  }

  // Allow public paths
  if (PUBLIC_PATHS.some(p => path === p || path.startsWith(p))) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // If accessing API route, return 401
    if (path.startsWith('/api/')) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ), origin);
    }
    // Otherwise redirect to login
    return NextResponse.redirect(new URL('/login_page', request.url));
  }

  try {
    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Add user info to headers for route handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);
    requestHeaders.set('x-user-email', payload.email as string);
    
    if (payload.customerId) {
      requestHeaders.set('x-customer-id', payload.customerId as string);
    }

    // Check admin routes
    if ((path.startsWith('/api/admin/') || path.startsWith('/pages/admin')) && payload.role !== 'ADMIN') {
      if (path.startsWith('/api/')) {
        return addCorsHeaders(NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        ), origin);
      }
      return NextResponse.redirect(new URL('/customer_dashboard', request.url));
    }

    // Check customer routes for regular users
    if (path.startsWith('/pages/customer_dashboard') && !payload.customerId && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Redirect admins trying to access customer routes to admin dashboard
    if (path.startsWith('/pages/customer_dashboard') && payload.role === 'ADMIN' && !payload.customerId) {
      return NextResponse.redirect(new URL('/pages/admin', request.url));
    }

    // Add security headers
    const response = NextResponse.next({
      headers: requestHeaders,
    });

    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'same-origin');
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    );

    // Add CORS headers for API routes
    if (path.startsWith('/api/')) {
      addCorsHeaders(response, origin);
    }

    return response;
  } catch (error) {
    console.error('Token verification error:', error);
    // If token is invalid, clear it and redirect to login
    const response = path.startsWith('/api/')
      ? addCorsHeaders(NextResponse.json({ error: 'Invalid token' }, { status: 401 }), origin)
      : NextResponse.redirect(new URL('/login_page', request.url));

    response.cookies.delete('auth-token');
    return response;
  }
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 