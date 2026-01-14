// =============================================================================
// Middleware - Route Protection
// =============================================================================
// Protects routes that require authentication using NextAuth.js.
// Redirects unauthenticated users to the login page.
// =============================================================================

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Check if user is trying to access admin routes
    if (path.startsWith("/admin")) {
      // Only allow admin and superadmin roles
      if (token?.role !== "admin" && token?.role !== "superadmin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Return true if the user is authenticated
      authorized: ({ token }) => !!token,
    },
  }
);

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
