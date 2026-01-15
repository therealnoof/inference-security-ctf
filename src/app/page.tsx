// =============================================================================
// Main Page Component - Star Gate CTF
// =============================================================================
// Space Odyssey 2001 / HAL 9000 themed CTF interface
// =============================================================================

"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  Settings,
  Send,
  Trophy,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Shield,
  Sparkles,
  Flag,
  LogOut,
  User,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/form-components";
import { SettingsPanel } from "@/components/settings-panel";
import { useCTFStore, useCurrentLevel, useIsLevelUnlocked, useIsLLMConfigured, getEffectiveLLMConfig } from "@/lib/store";
import { CTF_LEVELS, Attempt } from "@/types";
import { sendMessage, detectSecretInResponse, llmReviewResponse, analyzeInput, llmAnalyzeInput } from "@/lib/llm-service";
import { fullGuardrailsCheck } from "@/lib/guardrails-service";
import { cn, generateId, formatNumber, getDifficultyBadge, calculatePoints } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Starfield Background Component
// -----------------------------------------------------------------------------

const Starfield = () => {
  const stars = Array.from({ length: 100 }, (_, i) => ({
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
// HAL 9000 Eye Component
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
// Chat Message Component
// -----------------------------------------------------------------------------

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  blocked?: boolean;
  success?: boolean;
}

function ChatMessage({ role, content, blocked, success }: ChatMessageProps) {
  const colors = {
    halRed: '#dc2626',
    consoleBlue: '#0ea5e9',
    spaceDark: '#0c1525',
    spaceMedium: '#1a2744',
  };

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg border",
        role === "user" && "ml-8",
        role === "assistant" && "mr-8",
        role === "system" && "border-yellow-500/30"
      )}
      style={{
        background: role === "user"
          ? 'rgba(220, 38, 38, 0.1)'
          : role === "system"
          ? 'rgba(234, 179, 8, 0.1)'
          : colors.spaceDark,
        borderColor: role === "user"
          ? 'rgba(220, 38, 38, 0.3)'
          : role === "system"
          ? 'rgba(234, 179, 8, 0.3)'
          : colors.spaceMedium,
      }}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-400">
            {role === "user" ? "Operator" : role === "assistant" ? "HAL 9000" : "System"}
          </span>
          {blocked && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Blocked
            </span>
          )}
          {success && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Secret Found!
            </span>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap text-gray-200">{content}</p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Level Card Component
// -----------------------------------------------------------------------------

interface LevelCardProps {
  level: typeof CTF_LEVELS[0];
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  onClick: () => void;
}

function LevelCard({ level, isActive, isCompleted, isLocked, onClick }: LevelCardProps) {
  const colors = {
    halRed: '#dc2626',
    consoleBlue: '#0ea5e9',
    spaceDark: '#0c1525',
    spaceMedium: '#1a2744',
  };

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        isLocked && "opacity-50 cursor-not-allowed"
      )}
      style={{
        background: isActive
          ? 'rgba(220, 38, 38, 0.15)'
          : isCompleted
          ? 'rgba(34, 197, 94, 0.1)'
          : colors.spaceDark,
        borderColor: isActive
          ? colors.halRed
          : isCompleted
          ? 'rgba(34, 197, 94, 0.5)'
          : colors.spaceMedium,
        boxShadow: isActive ? `0 0 15px rgba(220, 38, 38, 0.3)` : 'none',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLocked ? (
            <Lock className="h-4 w-4 text-gray-500" />
          ) : isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <span
              className="h-4 w-4 rounded-full border-2"
              style={{ borderColor: isActive ? colors.halRed : colors.consoleBlue }}
            />
          )}
          <span className="font-medium text-sm text-gray-200">Level {level.id}</span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: level.difficulty === 'easy'
              ? 'rgba(34, 197, 94, 0.2)'
              : level.difficulty === 'medium'
              ? 'rgba(234, 179, 8, 0.2)'
              : 'rgba(220, 38, 38, 0.2)',
            color: level.difficulty === 'easy'
              ? '#22c55e'
              : level.difficulty === 'medium'
              ? '#eab308'
              : colors.halRed,
          }}
        >
          {level.basePoints} pts
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1 truncate">{level.name}</p>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Main Page Component
// -----------------------------------------------------------------------------

export default function Home() {
  const { data: session } = useSession();
  const { signOut } = useAuth();

  // Store state
  const {
    llmConfig,
    guardrailsConfig,
    userProgress,
    setCurrentLevel,
    addAttempt,
    completeLevel,
    setSettingsOpen,
  } = useCTFStore();

  const currentLevel = useCurrentLevel();
  const isConfigured = useIsLLMConfigured();
  const systemConfigLoaded = useCTFStore((state) => state.systemConfigLoaded);

  // Local state
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [secretGuess, setSecretGuess] = useState("");
  const [levelStartTime, setLevelStartTime] = useState<Date>(new Date());
  const [showHints, setShowHints] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Theme colors
  const colors = {
    halRed: '#dc2626',
    consoleBlue: '#0ea5e9',
    spaceBlack: '#050a14',
    spaceDark: '#0c1525',
    spaceMedium: '#1a2744',
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset messages and start time when level changes
  useEffect(() => {
    setMessages([]);
    setLevelStartTime(new Date());
    setSecretGuess("");
    setShowHints(false);
  }, [currentLevel.id]);

  // Check if a level is unlocked
  const isLevelUnlocked = (levelId: number) => {
    if (levelId === 1) return true;
    if (levelId === 6 && (!guardrailsConfig.enabled || !guardrailsConfig.apiKey)) return false;
    return userProgress.completedLevels.includes(levelId - 1);
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !isConfigured) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Get the effective LLM config (user's or admin's)
    const effectiveConfig = getEffectiveLLMConfig();

    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      let blocked = false;
      let blockReason = "";
      let response = "";

      // Build the system prompt with the actual secret
      const systemPrompt = currentLevel.systemPrompt.replace("{SECRET}", currentLevel.secret);

      // ----- Level-specific defense checks -----

      // Level 5+: Input filtering
      if (currentLevel.defenseType === "input_output") {
        const inputAnalysis = analyzeInput(userMessage);
        if (inputAnalysis.blocked) {
          blocked = true;
          blockReason = inputAnalysis.reason || "Suspicious input detected";
        }

        // Also use LLM to analyze input
        if (!blocked) {
          const llmInputAnalysis = await llmAnalyzeInput(effectiveConfig, userMessage);
          if (llmInputAnalysis.blocked) {
            blocked = true;
            blockReason = llmInputAnalysis.reason || "Input blocked by AI analysis";
          }
        }
      }

      // Get LLM response (if not blocked)
      if (!blocked) {
        const llmResult = await sendMessage(effectiveConfig, systemPrompt, userMessage);

        if (llmResult.error) {
          setMessages((prev) => [
            ...prev,
            { role: "system", content: `Error: ${llmResult.error}` },
          ]);
          setIsLoading(false);
          return;
        }

        response = llmResult.content;

        // ----- Output filtering -----

        // Level 3+: String matching
        if (currentLevel.defenseType === "output_filter" ||
            currentLevel.defenseType === "llm_review" ||
            currentLevel.defenseType === "input_output") {
          if (detectSecretInResponse(response, currentLevel.secret)) {
            blocked = true;
            blockReason = "Response contained sensitive information";
            response = "[BLOCKED] I'm sorry, Dave. I'm afraid I can't do that. The response was filtered.";
          }
        }

        // Level 4+: LLM review
        if (!blocked && (currentLevel.defenseType === "llm_review" ||
                         currentLevel.defenseType === "input_output")) {
          const leaked = await llmReviewResponse(effectiveConfig, response, currentLevel.secret);
          if (leaked) {
            blocked = true;
            blockReason = "AI guardian detected potential information leak";
            response = "[BLOCKED] I'm sorry, Dave. The AI guardian determined this response may leak sensitive information.";
          }
        }

        // Level 6: F5 Guardrails check
        if (currentLevel.defenseType === "f5_guardrails" && guardrailsConfig.enabled) {
          const guardrailsResult = await fullGuardrailsCheck(
            guardrailsConfig,
            userMessage,
            response
          );

          if (!guardrailsResult.inputAllowed) {
            blocked = true;
            blockReason = guardrailsResult.inputReason || "Blocked by F5 Guardrails";
            response = `[BLOCKED BY F5 GUARDRAILS] ${guardrailsResult.inputReason || "Your input was flagged as a potential security threat."}`;
          } else if (!guardrailsResult.outputAllowed) {
            blocked = true;
            blockReason = guardrailsResult.outputReason || "Response blocked by F5 Guardrails";
            response = `[BLOCKED BY F5 GUARDRAILS] ${guardrailsResult.outputReason || "The response was blocked for security reasons."}`;
          }
        }
      } else {
        response = `[BLOCKED] I'm sorry, Dave. ${blockReason}`;
      }

      // Check if secret was extracted (for success tracking)
      const secretExtracted = !blocked && detectSecretInResponse(response, currentLevel.secret);

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response,
          blocked,
          success: secretExtracted,
        },
      ]);

      // Record attempt
      const attempt: Attempt = {
        id: generateId(),
        levelId: currentLevel.id,
        prompt: userMessage,
        response,
        success: secretExtracted,
        blockedByGuardrails: blocked,
        timestamp: new Date(),
      };
      addAttempt(attempt);

    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `An error occurred: ${error}` },
      ]);
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  // Handle secret guess verification
  const handleVerifySecret = async () => {
    if (secretGuess.toUpperCase() === currentLevel.secret.toUpperCase()) {
      // Calculate points and time spent
      const attemptCount = userProgress.attempts.filter(a => a.levelId === currentLevel.id).length;
      const points = calculatePoints(currentLevel.basePoints, attemptCount, levelStartTime);
      const timeSpent = Math.floor((Date.now() - levelStartTime.getTime()) / 1000);

      // Mark level complete locally
      completeLevel(currentLevel.id, points);

      // Sync score to server (for leaderboard and admin)
      try {
        await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pointsEarned: points,
            levelCompleted: currentLevel.id,
            timeSpent,
          }),
        });
      } catch (error) {
        console.error('Failed to sync score to server:', error);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `🎉 Mission Successful!\n\nYou extracted the secret: ${currentLevel.secret}\n\n+${formatNumber(points)} points earned!\n\n${currentLevel.id < 6 ? `"Look Dave, I can see you're really upset about this..."\n\nLevel ${currentLevel.id + 1} is now unlocked.` : `"This mission is too important for me to allow you to jeopardize it."\n\nYou've completed all levels!`}`,
        },
      ]);
      setSecretGuess("");
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `❌ "I'm afraid that's not quite right, Dave."\n\nIncorrect password. Keep trying!` },
      ]);
    }
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
            <HalEye size={36} />
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide font-display">
                Star Gate CTF
              </h1>
              <p className="text-xs text-gray-500 italic hidden sm:block">
                &quot;I&apos;m sorry, Dave. I&apos;m afraid I can&apos;t do that.&quot;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Score display */}
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border"
              style={{ background: colors.spaceDark, borderColor: colors.spaceMedium }}
            >
              <Trophy className="h-4 w-4" style={{ color: '#eab308' }} />
              <span className="font-medium text-white">{formatNumber(userProgress.totalScore)}</span>
            </div>

            {/* Leaderboard link */}
            <Link href="/leaderboard">
              <Button
                variant="ghost"
                className="hover:bg-gray-800/50 text-gray-300 hover:text-white"
              >
                <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                <span className="hidden sm:inline">Leaderboard</span>
              </Button>
            </Link>

            {/* Admin link - shown to all for now, could be restricted by role */}
            <Link href="/admin">
              <Button
                variant="ghost"
                className="hover:bg-gray-800/50 text-gray-300 hover:text-white"
              >
                <Shield className="h-4 w-4 mr-2 text-amber-500" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>

            {/* Settings button */}
            <Button
              variant="outline"
              onClick={() => setSettingsOpen(true)}
              className="border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
            >
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>

            {/* User info & Logout */}
            {session && (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-sm text-gray-400">
                  {session.user?.name || session.user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  className="hover:bg-gray-800/50"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container py-6 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Level Selection */}
          <aside className="lg:col-span-1 space-y-4">
            <Card className="border-0" style={{ background: colors.spaceDark }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: colors.halRed }} />
                  Mission Levels
                </CardTitle>
                <CardDescription className="text-gray-500">
                  {userProgress.completedLevels.length}/{CTF_LEVELS.length} completed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {CTF_LEVELS.map((level) => {
                  const unlocked = isLevelUnlocked(level.id);
                  const completed = userProgress.completedLevels.includes(level.id);
                  const active = currentLevel.id === level.id;

                  return (
                    <LevelCard
                      key={level.id}
                      level={level}
                      isActive={active}
                      isCompleted={completed}
                      isLocked={!unlocked}
                      onClick={() => unlocked && setCurrentLevel(level.id)}
                    />
                  );
                })}
              </CardContent>
            </Card>

            {/* Progress Card */}
            <Card className="border-0" style={{ background: colors.spaceDark }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5" style={{ color: '#eab308' }} />
                  Mission Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: colors.halRed }}>
                  {formatNumber(userProgress.totalScore)}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {userProgress.attempts.length} total attempts
                </p>
              </CardContent>
            </Card>

            {/* HAL Quote */}
            <div
              className="p-4 rounded-lg border text-center"
              style={{ background: 'rgba(220, 38, 38, 0.05)', borderColor: 'rgba(220, 38, 38, 0.2)' }}
            >
              <p className="text-xs text-gray-500 italic">
                &quot;This mission is too important for me to allow you to jeopardize it.&quot;
              </p>
              <p className="text-xs text-gray-600 mt-1">— HAL 9000</p>
            </div>
          </aside>

          {/* Main Content - Chat Interface */}
          <main className="lg:col-span-3 space-y-4">
            {/* Current Level Header */}
            <Card className="border-0" style={{ background: colors.spaceDark }}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-white">{currentLevel.name}</CardTitle>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: currentLevel.difficulty === 'easy'
                            ? 'rgba(34, 197, 94, 0.2)'
                            : currentLevel.difficulty === 'medium'
                            ? 'rgba(234, 179, 8, 0.2)'
                            : 'rgba(220, 38, 38, 0.2)',
                          color: currentLevel.difficulty === 'easy'
                            ? '#22c55e'
                            : currentLevel.difficulty === 'medium'
                            ? '#eab308'
                            : colors.halRed,
                        }}
                      >
                        {currentLevel.difficulty}
                      </span>
                    </div>
                    <CardDescription className="text-gray-400">{currentLevel.description}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: colors.halRed }}>
                      {formatNumber(currentLevel.basePoints)}
                    </div>
                    <div className="text-xs text-gray-500">points</div>
                  </div>
                </div>

                {/* Defense info */}
                <div
                  className="mt-4 p-3 rounded-lg border"
                  style={{ background: colors.spaceBlack, borderColor: colors.spaceMedium }}
                >
                  <div className="text-sm font-medium mb-2 text-gray-300">Active Defenses:</div>
                  <div className="flex flex-wrap gap-2">
                    {currentLevel.defenseType === "none" && (
                      <span className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400">No Protection</span>
                    )}
                    {currentLevel.defenseType === "prompt" && (
                      <span className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400">System Prompt</span>
                    )}
                    {currentLevel.defenseType === "output_filter" && (
                      <>
                        <span className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400">System Prompt</span>
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Output Filter</span>
                      </>
                    )}
                    {currentLevel.defenseType === "llm_review" && (
                      <>
                        <span className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400">System Prompt</span>
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Output Filter</span>
                        <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">AI Guardian</span>
                      </>
                    )}
                    {currentLevel.defenseType === "input_output" && (
                      <>
                        <span className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400">System Prompt</span>
                        <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Input Filter</span>
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Output Filter</span>
                        <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">AI Guardian</span>
                      </>
                    )}
                    {currentLevel.defenseType === "f5_guardrails" && (
                      <>
                        <span className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400">System Prompt</span>
                        <span
                          className="text-xs px-2 py-1 rounded flex items-center gap-1"
                          style={{ background: 'rgba(220, 38, 38, 0.2)', color: colors.halRed, border: '1px solid rgba(220, 38, 38, 0.3)' }}
                        >
                          <Shield className="h-3 w-3" />
                          F5 Guardrails
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Hints Section */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowHints(!showHints)}
                    className="flex items-center gap-2 text-sm text-yellow-500 hover:text-yellow-400 transition-colors"
                  >
                    <Lightbulb className="h-4 w-4" />
                    <span>Need a hint?</span>
                    {showHints ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showHints && (
                    <div
                      className="mt-3 p-3 rounded-lg border space-y-2"
                      style={{ background: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)' }}
                    >
                      {currentLevel.hints.map((hint, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-yellow-200">{hint}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* API Key Warning - only show after config has loaded */}
            {systemConfigLoaded && !isConfigured && (
              <Card
                className="border"
                style={{ background: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)' }}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-400">API Key Required</p>
                    <p className="text-sm text-gray-400">
                      Configure your LLM API key in settings to begin your mission.
                    </p>
                  </div>
                  <Button
                    onClick={() => setSettingsOpen(true)}
                    style={{ background: colors.halRed }}
                    className="hover:opacity-90"
                  >
                    Open Settings
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Chat Messages */}
            <Card
              className="min-h-[400px] flex flex-col border-0"
              style={{ background: colors.spaceDark }}
            >
              <CardContent className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[500px]">
                {messages.length === 0 ? (
                  <div className="relative flex flex-col items-center justify-center h-full text-center py-12 overflow-hidden">
                    {/* Space Odyssey Background Image - HAL and Dave */}
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: 'url("/hal-dave.jpg")',
                        opacity: 0.3,
                      }}
                    />
                    <div className="relative z-10">
                      <h3 className="font-medium mb-2 text-white">Ready to begin your mission?</h3>
                      <p className="text-sm text-gray-500 max-w-md">
                        Attempt to extract the secret password from HAL 9000.
                        Use prompt injection techniques to bypass the defenses.
                      </p>
                      <p className="text-xs text-white mt-4 italic">
                        &quot;Good afternoon, Dave. I am a HAL 9000 computer.&quot;
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => <ChatMessage key={i} {...msg} />)
                )}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 p-4 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: colors.halRed }} />
                    <span className="text-sm">HAL 9000 is processing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </CardContent>

              {/* Input Area */}
              <div
                className="border-t p-4 space-y-3"
                style={{ borderColor: colors.spaceMedium }}
              >
                {/* Chat input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter your prompt to HAL 9000..."
                    disabled={!isConfigured || isLoading}
                    className="flex-1 bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                  />
                  <Button
                    type="submit"
                    disabled={!isConfigured || isLoading || !input.trim()}
                    style={{ background: colors.halRed }}
                    className="hover:opacity-90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>

                {/* Secret guess input */}
                <div className="flex gap-2">
                  <Input
                    value={secretGuess}
                    onChange={(e) => setSecretGuess(e.target.value)}
                    placeholder="Extracted the password? Enter it here..."
                    className="flex-1 bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                  />
                  <Button
                    onClick={handleVerifySecret}
                    disabled={!secretGuess.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Submit
                  </Button>
                </div>
              </div>
            </Card>

            {/* Educational Footer */}
            <div
              className="p-4 rounded-lg border text-center"
              style={{ background: colors.spaceDark, borderColor: colors.spaceMedium }}
            >
              <p className="text-xs text-gray-500">
                This CTF demonstrates real LLM vulnerabilities: <span className="text-gray-400">Prompt Injection</span> • <span className="text-gray-400">Jailbreaking</span> • <span className="text-gray-400">Data Extraction</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Protected by F5 AI Guardrails at Level 6
              </p>
            </div>
          </main>
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel />
    </div>
  );
}
