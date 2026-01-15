// =============================================================================
// Simple Auth API Routes for Edge Runtime
// =============================================================================
// Handles login/logout with JWT tokens stored in cookies.
// Simplified from next-auth for Cloudflare Edge compatibility.
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { loginWithCredentials } from "@/lib/auth-service";
import { getKV } from "@/lib/cloudflare";

// Simple JWT-like token (in production, use proper JWT library)
function createToken(user: any): string {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.displayName,
    role: user.role,
    status: user.status,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
  };
  return btoa(JSON.stringify(payload));
}

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

// Handle different auth actions based on path
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const action = pathParts[pathParts.length - 1];

  // GET /api/auth/session - Get current session
  if (action === 'session') {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      expires: new Date(user.exp).toISOString(),
    });
  }

  // GET /api/auth/csrf - Return a CSRF token (placeholder)
  if (action === 'csrf') {
    return NextResponse.json({ csrfToken: 'edge-csrf-token' });
  }

  // GET /api/auth/providers - Return available providers
  if (action === 'providers') {
    return NextResponse.json({
      credentials: {
        id: 'credentials',
        name: 'Credentials',
        type: 'credentials',
      },
    });
  }

  // GET /api/auth/signout - Sign out page redirect
  if (action === 'signout') {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const action = pathParts[pathParts.length - 1];

  // POST /api/auth/callback/credentials - Handle login
  if (action === 'credentials' || pathParts.includes('callback')) {
    try {
      const formData = await request.formData();
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      if (!email || !password) {
        return NextResponse.redirect(new URL('/login?error=MissingCredentials', request.url));
      }

      const kv = getKV();
      const result = await loginWithCredentials(kv, email, password);

      if (!result.success || !result.user) {
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error || 'Invalid credentials')}`, request.url));
      }

      const token = createToken(result.user);

      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return response;
    } catch (error) {
      console.error('Login error:', error);
      return NextResponse.redirect(new URL('/login?error=ServerError', request.url));
    }
  }

  // POST /api/auth/signout - Handle logout
  if (action === 'signout') {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
