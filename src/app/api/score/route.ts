// =============================================================================
// Score Update API Endpoint
// =============================================================================
// Updates user scores in KV when they complete a level.
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { updateUserScore, updateUserActivity } from '@/lib/auth-service';
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

    // Verify token
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

    // Parse request body
    const body = await request.json();
    const { pointsEarned, levelCompleted, timeSpent } = body;

    if (typeof pointsEarned !== 'number' || typeof levelCompleted !== 'number') {
      return NextResponse.json(
        { error: 'pointsEarned and levelCompleted are required' },
        { status: 400 }
      );
    }

    // Update score and activity in KV
    const kv = getKV();
    const result = await updateUserScore(kv, userId, pointsEarned, levelCompleted, timeSpent || 0);

    // Update user activity timestamp
    updateUserActivity(kv, userId).catch(console.error);

    return NextResponse.json({
      success: result.success,
      alreadyCompleted: result.alreadyCompleted,
      pointsAwarded: result.alreadyCompleted ? 0 : pointsEarned
    });
  } catch (error) {
    console.error('Score update error:', error);
    return NextResponse.json(
      { error: 'Failed to update score' },
      { status: 500 }
    );
  }
}
