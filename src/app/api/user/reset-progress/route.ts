// =============================================================================
// User Reset Progress API Endpoint
// =============================================================================
// Allows users to reset their own game progress (scores, levels, attempts).
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { resetUserStats } from '@/lib/auth-service';
import { getKV } from '@/lib/cloudflare';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify token and get user ID
    let userId: string;
    try {
      const payload = JSON.parse(atob(token));
      if (payload.exp < Date.now()) {
        return NextResponse.json(
          { error: 'Token expired' },
          { status: 401 }
        );
      }
      userId = payload.id;
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Reset the user's own stats
    const kv = getKV();
    const result = await resetUserStats(kv, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reset progress' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Your progress has been reset successfully'
    });
  } catch (error) {
    console.error('Reset progress error:', error);
    return NextResponse.json(
      { error: 'Failed to reset progress' },
      { status: 500 }
    );
  }
}
