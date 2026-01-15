// =============================================================================
// Leaderboard API Route
// =============================================================================
// Public endpoint to fetch leaderboard data with optional time filtering.
// =============================================================================

export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/auth-service";
import { getKV } from "@/lib/cloudflare";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100');
  const timeframe = searchParams.get('timeframe') as 'all' | 'weekly' | 'daily' || 'all';

  try {
    const kv = getKV();
    const leaderboard = await getLeaderboard(kv, { limit, timeframe });

    // Map to leaderboard format
    const data = leaderboard.map((user, index) => ({
      rank: index + 1,
      visibleId: user.id.slice(-8),
      displayName: user.displayName,
      totalScore: user.totalScore,
      levelsCompleted: user.levelsCompleted,
      bestTime: user.bestTime,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
