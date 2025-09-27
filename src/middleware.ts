import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { handleRateLimit } from "@/lib/security/rateLimit";

export async function middleware(request: NextRequest) {
  // ✅ Apply rate limiting to sensitive routes
  if (request.nextUrl.pathname.startsWith("/api/") || isServerAction(request)) {
    // Different rate limits for different routes
    let rateLimitConfig = { limit: 100, windowMs: 60000 }; // Default: 100 requests per minute

    if (request.nextUrl.pathname.includes("/api/checkins")) {
      rateLimitConfig = { limit: 20, windowMs: 60000 }; // 20 requests per minute for checkins API
    } else if (request.nextUrl.pathname.includes("/api/nearby")) {
      rateLimitConfig = { limit: 30, windowMs: 60000 }; // 30 requests per minute for nearby API
    } else if (isServerAction(request)) {
      rateLimitConfig = { limit: 50, windowMs: 60000 }; // 50 server actions per minute
    }

    const rateLimitResponse = handleRateLimit(request, rateLimitConfig);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }
  const response = await updateSession(request);
  const headers = new Headers(response.headers);

  //  Update CSP to allow Supabase WebSocket
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      // ✅ ADD: WebSocket support for Supabase realtime
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://places.googleapis.com",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  // Other security headers
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // ✅ FIX: Allow geolocation (your app requires it)
  headers.set("Permissions-Policy", "geolocation=(self)"); // Changed from () to (self)

  return NextResponse.next({
    request,
    headers,
  });
}

function isServerAction(request: NextRequest): boolean {
  // Server actions have these characteristics:

  // 1. Must be a POST request
  if (request.method !== "POST") {
    return false;
  }

  // 2. Must have the Next-Action header (this is the primary identifier)
  const nextActionHeader = request.headers.get("next-action");
  if (!nextActionHeader) {
    return false;
  }

  // 3. Content-Type should be specific to server actions
  const contentType = request.headers.get("content-type");
  const isFormData = contentType
    ? contentType.includes("multipart/form-data")
    : false;
  const isFormEncoded = contentType
    ? contentType.includes("application/x-www-form-urlencoded")
    : false;

  // Server actions typically use one of these content types
  if (!isFormData && !isFormEncoded) {
    return false;
  }

  // 4. Optional: Check for Next.js specific headers
  const nextRouterStateTree = request.headers.get("next-router-state-tree");
  const hasNextRouterHeader = nextRouterStateTree !== null;

  // 5. Optional: Server actions usually target page routes, not /api routes
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  return !isApiRoute && (isFormData || isFormEncoded) && hasNextRouterHeader;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
