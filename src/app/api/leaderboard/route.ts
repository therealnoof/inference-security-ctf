// =============================================================================
// Leaderboard API Route
// =============================================================================
// Public endpoint to fetch leaderboard data with optional time filtering.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/auth-service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100');
  const timeframe = searchParams.get('timeframe') as 'all' | 'weekly' | 'daily' || 'all';

  try {
    const leaderboard = await getLeaderboard({ limit, timeframe });

    // Map to leaderboard format
    const data = leaderboard.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      displayName: user.displayName,
      score: user.totalScore,
      levelsCompleted: user.levelsCompleted,
      bestTime: user.bestTime,
      avatarUrl: user.avatarUrl,
    }));

    return NextResponse.json({ leaderboard: data });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
