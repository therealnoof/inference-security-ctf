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
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const kv = getKV();
    const result = await loginWithCredentials(kv, email, password);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = createToken(result.user);

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.displayName,
        role: result.user.role,
      },
    });

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
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
