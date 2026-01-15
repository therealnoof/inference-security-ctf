// =============================================================================
// Middleware - Route Protection (Edge Compatible)
// =============================================================================
// Protects routes that require authentication using simple JWT tokens.
// Redirects unauthenticated users to the login page.
// =============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple token verification (must match auth route)
function verifyToken(token: string): any | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Get auth token from cookie
  const token = req.cookies.get('auth-token')?.value;
  const user = token ? verifyToken(token) : null;

  // If not authenticated, redirect to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Check if user is trying to access admin routes
  if (path.startsWith("/admin")) {
    // Only allow admin and superadmin roles
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

// =============================================================================
// Route Matching Configuration
// =============================================================================
// Specify which routes should be protected by this middleware.
// Routes not listed here will be publicly accessible.
// =============================================================================

export const config = {
  matcher: [
    // Protect the main game page
    "/",
    // Protect admin routes
    "/admin/:path*",
    // Protect API routes (except auth)
    "/api/admin/:path*",
    // Don't protect these routes:
    // - /login
    // - /register  
    // - /api/auth (NextAuth routes)
    // - /api/leaderboard (public)
    // - /_next (Next.js internals)
    // - /favicon.ico, /images, etc.
  ],
};
