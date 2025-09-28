// src/middleware.ts - OPTIMIZED
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Only apply auth middleware to protected routes
  if (!request.nextUrl.pathname.startsWith("/places")) {
    return NextResponse.next();
  }

  const response = await updateSession(request);

  // Simplified security headers
  const headers = new Headers(response.headers);
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Permissions-Policy", "geolocation=(self)");

  return NextResponse.next({
    request,
    headers,
  });
}

export const config = {
  matcher: ["/places/:path*"], // Only match protected routes
};
