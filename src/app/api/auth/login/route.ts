// =============================================================================
// Login API Route for Edge Runtime
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { loginWithCredentials } from "@/lib/auth-service";
import { getKV } from "@/lib/cloudflare";

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

export async function POST(request: NextRequest) {
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
