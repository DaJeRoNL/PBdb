import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Simple in-memory rate limit store
// Note: For production with serverless, use Redis/Upstash
const rateLimit = new Map();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute per IP

// --- GEOGRAPHIC RESTRICTION CONFIG ---
const ALLOWED_COUNTRIES = ['NL', 'PH']; // Netherlands, Philippines
const GEO_RESTRICTION_ENABLED = process.env.GEO_RESTRICTION_ENABLED === 'true';

// Whitelist for bypass (e.g., your home IP, office IP)
// Format: Comma-separated IPs, whitespace is automatically trimmed
// Example: "203.123.45.67, 185.98.76.54, 192.168.1.100"
const WHITELISTED_IPS = (process.env.WHITELISTED_IPS || '')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

export async function middleware(request: NextRequest) {
  // --- 0. KILL SWITCH (PANIC MODE) ---
  // If set to "true" in Vercel Env Vars, immediately blocks ALL access.
  if (process.env.PANIC_MODE === 'true') {
    return new NextResponse('SYSTEM LOCKDOWN INITIATED. ACCESS REVOKED.', { status: 503 });
  }

  // Get IP from headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
  
  // --- 0.5. GEOGRAPHIC IP RESTRICTION (NL + PH ONLY) ---
  if (GEO_RESTRICTION_ENABLED) {
    // Check if IP is whitelisted first
    const isWhitelisted = WHITELISTED_IPS.includes(ip);
    
    if (!isWhitelisted) {
      // Get country from Vercel's geo object (runtime only) or fallback to header
      // TypeScript doesn't know about request.geo, but it exists at runtime on Vercel
      const country = (request as any).geo?.country || request.headers.get('x-vercel-ip-country');
      
      // Block if country is not NL or PH
      if (country && !ALLOWED_COUNTRIES.includes(country)) {
        console.log(`[GEO-BLOCK] Blocked access from ${country} (IP: ${ip})`);
        
        return new NextResponse(
          JSON.stringify({
            error: 'Access Denied',
            message: 'Access is only allowed from authorized regions.',
            support: 'If you believe this is an error, contact your system administrator.'
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'X-Geo-Blocked': 'true',
              'X-Blocked-Country': country,
            }
          }
        );
      }
      
      // Log successful geo-check for monitoring (only when enabled)
      if (country && ALLOWED_COUNTRIES.includes(country)) {
        console.log(`[GEO-ALLOW] Access from ${country} (IP: ${ip})`);
      }
    } else {
      console.log(`[GEO-WHITELIST] Whitelisted IP access: ${ip}`);
    }
  }
  
  // --- 1. HTTPS REDIRECT ---
  if (process.env.NODE_ENV === 'production' && 
      request.headers.get('x-forwarded-proto') !== 'https') {
    return NextResponse.redirect(`https://${request.headers.get('host')}${request.nextUrl.pathname}`);
  }

  // --- 2. RATE LIMITING ---
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  const requestTimestamps = rateLimit.get(ip) || [];
  const requestsInWindow = requestTimestamps.filter((timestamp: number) => timestamp > windowStart);
  
  if (requestsInWindow.length >= MAX_REQUESTS) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  requestsInWindow.push(now);
  rateLimit.set(ip, requestsInWindow);

  // --- 3. INITIALIZE RESPONSE ---
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // --- 4. SECURITY HEADERS (CSP, HSTS, etc.) ---
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  
  // Content Security Policy - WITH CLOUDFLARE TURNSTILE SUPPORT
  const cspDirectives = [
    "default-src 'self'",
    // Script sources: Allow Google OAuth + Cloudflare Turnstile
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://challenges.cloudflare.com",
    // Script element sources: Required for Turnstile widget script tag
    "script-src-elem 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://challenges.cloudflare.com",
    // Styles: Allow inline styles and Google
    "style-src 'self' 'unsafe-inline' https://accounts.google.com",
    // Images: Allow self, data URIs, blobs, and Google user content
    "img-src 'self' data: blob: https://*.googleusercontent.com",
    // Frames: Allow Google OAuth + Cloudflare Turnstile + Google Docs + blob for PDF preview
    "frame-src 'self' blob: https://docs.google.com https://accounts.google.com https://challenges.cloudflare.com",
    // API connections: Allow Supabase (HTTP + WebSocket) + Google + Cloudflare
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://challenges.cloudflare.com",
    // Additional security directives
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ];
  
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Additional security headers
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // --- 5. SUPABASE AUTH & RBAC ---
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 6. Redirect Logic
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');
  const isPublicRoute = request.nextUrl.pathname === '/';

  // If NO USER and trying to access protected route
  if (!user && !isPublicRoute && !isAuthRoute) {
    
    // Case A: It's an API Call -> Return JSON 401
    if (isApiRoute) {
       return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { 
         status: 401, 
         headers: { 'Content-Type': 'application/json' } 
       });
    }

    // Case B: It's a Page Visit -> Redirect to Login
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    // Check Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'client'

    // SECURITY RULE: Clients cannot access internal modules
    if (role === 'client') {
      if (request.nextUrl.pathname.startsWith('/opsbyte') || 
          request.nextUrl.pathname.startsWith('/placebyte') ||
          request.nextUrl.pathname.startsWith('/corebyte')) {
        return NextResponse.redirect(new URL('/portal', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}