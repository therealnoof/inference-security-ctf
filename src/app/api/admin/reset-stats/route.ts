// =============================================================================
// Admin API - Reset Stats
// =============================================================================
// Allows admins to reset user statistics (scores, attempts, levels)
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { resetAllUserStats, resetUserStats } from '@/lib/auth-service';
import { getKV } from '@/lib/cloudflare';
import { UserRole } from '@/types/auth';

// Check admin permission using cookie-based auth
async function checkAdminPermission(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  try {
    const payload = JSON.parse(atob(token));

    if (payload.exp < Date.now()) {
      return {
        authorized: false,
        error: NextResponse.json({ error: 'Token expired' }, { status: 401 })
      };
    }

    // Only superadmins can reset stats
    if (payload.role !== 'superadmin') {
      return {
        authorized: false,
        error: NextResponse.json({ error: 'Forbidden - Superadmin access required' }, { status: 403 })
      };
    }

    return {
      authorized: true,
      adminId: payload.id,
      adminRole: payload.role as UserRole
    };
  } catch {
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    };
  }
}

// POST /api/admin/reset-stats
// Body: { userId?: string } - if userId provided, reset that user only; otherwise reset all
export async function POST(request: NextRequest) {
  const auth = await checkAdminPermission(request);
  if (!auth.authorized) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body;
    const kv = getKV();

    if (userId) {
      // Reset single user
      const result = await resetUserStats(kv, userId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'User stats reset successfully' });
    } else {
      // Reset all users
      const result = await resetAllUserStats(kv);
      return NextResponse.json({
        success: true,
        message: `Stats reset for ${result.usersReset} users`
      });
    }
  } catch (error) {
    console.error('Reset stats error:', error);
    return NextResponse.json({ error: 'Failed to reset stats' }, { status: 500 });
  }
}
