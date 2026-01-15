// =============================================================================
// Register API Route
// =============================================================================
// Creates new user accounts with email/password authentication.
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/auth-service";
import { getKV } from "@/lib/cloudflare";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayName, email, password } = body;

    // Validate required fields
    if (!displayName || !email || !password) {
      return NextResponse.json(
        { error: "Display name, email, and password are required" },
        { status: 400 }
      );
    }

    const kv = getKV();
    const result = await registerUser(kv, email, password, displayName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
