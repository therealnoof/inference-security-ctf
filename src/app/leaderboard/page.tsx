// =============================================================================
// Leaderboard Page - Star Gate CTF
// =============================================================================
// Displays top players ranked by score
// =============================================================================

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Medal,
  Award,
  ArrowLeft,
  RefreshCw,
  Crown,
  Star,
  Target,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User } from "@/types/auth";

// -----------------------------------------------------------------------------
// Starfield Background Component
// -----------------------------------------------------------------------------

const Starfield = () => {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 3,
  }));

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{
        background: 'radial-gradient(ellipse at bottom, #0c1525 0%, #050a14 100%)',
        zIndex: -1
      }}
    >
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animation: `twinkle ${star.duration}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
            opacity: 0.6,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// -----------------------------------------------------------------------------
// HAL Eye Component
// -----------------------------------------------------------------------------

const HalEye = ({ size = 40 }: { size?: number }) => (
  <div
    className="relative rounded-full hal-eye flex-shrink-0"
    style={{
      width: size,
      height: size,
      background: 'radial-gradient(circle at 30% 30%, #ef4444, #dc2626 50%, #991b1b 100%)',
    }}
  >
    <div
      className="absolute rounded-full"
      style={{
        top: '25%',
        left: '25%',
        width: '25%',
        height: '25%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent 70%)'
      }}
    />
  </div>
);

// -----------------------------------------------------------------------------
// Rank Badge Component
// -----------------------------------------------------------------------------

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/50">
        <Crown className="h-5 w-5 text-yellow-400" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-400/20 border border-gray-400/50">
        <Medal className="h-5 w-5 text-gray-300" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-600/20 border border-amber-600/50">
        <Award className="h-5 w-5 text-amber-500" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700/50 border border-gray-600">
      <span className="text-sm font-bold text-gray-400">{rank}</span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Leaderboard Row Component
// -----------------------------------------------------------------------------

interface LeaderboardRowProps {
  user: User;
  rank: number;
}

function LeaderboardRow({ user, rank }: LeaderboardRowProps) {
  const colors = {
    halRed: '#dc2626',
    spaceDark: '#0c1525',
    spaceMedium: '#1a2744',
  };

  const isTopThree = rank <= 3;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
        isTopThree ? 'border-yellow-500/30' : ''
      }`}
      style={{
        background: isTopThree ? 'rgba(234, 179, 8, 0.05)' : colors.spaceDark,
        borderColor: isTopThree ? undefined : colors.spaceMedium,
      }}
    >
      <RankBadge rank={rank} />

      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{user.displayName}</div>
        <div className="text-sm text-gray-500">{user.levelsCompleted}/6 levels</div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="text-xl font-bold" style={{ color: colors.halRed }}>
            {user.totalScore.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">points</div>
        </div>

        {user.bestTime && (
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1 text-gray-400">
              <Clock className="h-3 w-3" />
              <span className="text-sm">
                {Math.floor(user.bestTime / 60)}:{(user.bestTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="text-xs text-gray-500">best time</div>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Leaderboard Page
// -----------------------------------------------------------------------------

export default function LeaderboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const colors = {
    halRed: '#dc2626',
    spaceBlack: '#050a14',
    spaceDark: '#0c1525',
    spaceMedium: '#1a2744',
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leaderboard?limit=50');
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      const data = await response.json();
      // Map API response to User format
      const mappedUsers: User[] = data.leaderboard.map((entry: any) => ({
        id: entry.id,
        displayName: entry.displayName,
        totalScore: entry.score,
        levelsCompleted: entry.levelsCompleted,
        bestTime: entry.bestTime,
        avatarUrl: entry.avatarUrl,
        email: '',
        role: 'player' as const,
        status: 'active' as const,
        totalAttempts: 0,
        createdAt: new Date(),
        authProvider: 'basic' as const,
      }));
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: colors.spaceBlack }}>
      <Starfield />

      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          background: 'rgba(5, 10, 20, 0.9)',
          borderColor: colors.spaceMedium,
        }}
      >
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <HalEye size={36} />
              <div>
                <h1 className="text-lg font-bold text-white tracking-wide font-display">
                  Star Gate CTF
                </h1>
                <p className="text-xs text-gray-500 italic hidden sm:block">
                  "I'm sorry, Dave. I'm afraid I can't do that."
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" className="border-gray-700 hover:border-gray-600">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to CTF
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-8 px-4 max-w-4xl mx-auto">
        <Card className="border-0" style={{ background: colors.spaceDark }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="p-3 rounded-lg"
                  style={{ background: 'rgba(234, 179, 8, 0.2)' }}
                >
                  <Trophy className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">Leaderboard</CardTitle>
                  <CardDescription className="text-gray-400">
                    Top operators ranked by mission score
                  </CardDescription>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={loadLeaderboard}
                disabled={loading}
                className="border-gray-700 hover:border-gray-600"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Loading leaderboard...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">No players on the leaderboard yet.</p>
                <p className="text-sm text-gray-600 mt-2">Be the first to complete a level!</p>
              </div>
            ) : (
              users.map((user, index) => (
                <LeaderboardRow key={user.id} user={user} rank={index + 1} />
              ))
            )}
          </CardContent>
        </Card>

        {/* HAL Quote */}
        <div
          className="mt-6 p-4 rounded-lg border text-center"
          style={{ background: 'rgba(220, 38, 38, 0.05)', borderColor: 'rgba(220, 38, 38, 0.2)' }}
        >
          <p className="text-sm text-gray-500 italic">
            "I am putting myself to the fullest possible use, which is all I think that any conscious entity can ever hope to do."
          </p>
          <p className="text-xs text-gray-600 mt-1">— HAL 9000</p>
        </div>
      </div>
    </div>
  );
}
