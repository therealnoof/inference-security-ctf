// =============================================================================
// Register API Route
// =============================================================================
// Creates new user accounts with email/password authentication.
// In production, this should use a real database like PostgreSQL or Supabase.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/auth-service";

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

    // Validate display name
    if (displayName.length < 2 || displayName.length > 30) {
      return NextResponse.json(
        { error: "Display name must be 2-30 characters" },
        { status: 400 }
      );
    }

    // Use registerUser which handles email/password validation and duplicate checking
    const result = await registerUser(email, password, displayName);

    if (!result.success) {
      // Map specific errors to appropriate status codes
      const statusCode = result.error?.includes('already registered') ? 409 : 400;
      return NextResponse.json(
        { error: result.error || "Failed to create account" },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: {
          id: result.user?.id,
          displayName: result.user?.displayName,
          email: result.user?.email,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
