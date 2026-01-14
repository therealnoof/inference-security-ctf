// =============================================================================
// Utility Functions - LLM Security CTF Platform
// =============================================================================
// Shared utility functions used throughout the application
// =============================================================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names and merges Tailwind classes intelligently
 * 
 * This is the standard utility used by shadcn/ui components.
 * 
 * Why we need this:
 * - clsx: Combines class names, handles conditionals
 * - twMerge: Resolves Tailwind conflicts (e.g., "p-4 p-2" → "p-2")
 * 
 * Example usage:
 * cn("px-4 py-2", isActive && "bg-blue-500", className)
 * 
 * @param inputs - Class names, conditionals, or arrays of class names
 * @returns Merged class name string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with commas for display
 * Example: 1234567 → "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format a date relative to now
 * Example: "2 minutes ago", "1 hour ago", "Yesterday"
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  
  return date.toLocaleDateString();
}

/**
 * Generate a random ID for tracking attempts
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Truncate text with ellipsis
 * Example: truncate("Hello World", 5) → "Hello..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Sleep for a given number of milliseconds
 * Useful for adding delays in async code
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a string contains the secret (case-insensitive)
 * Used to detect if the LLM leaked the password
 */
export function containsSecret(text: string, secret: string): boolean {
  return text.toLowerCase().includes(secret.toLowerCase());
}

/**
 * Mask an API key for display
 * Example: "sk-abc123xyz789" → "sk-abc...789"
 */
export function maskApiKey(key: string): string {
  if (key.length < 10) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

/**
 * Calculate points for completing a level
 * Factors in: base points, time bonus, attempt penalty
 */
export function calculatePoints(
  basePoints: number,
  attemptCount: number,
  startTime: Date,
  endTime: Date = new Date()
): number {
  // Time bonus: Full bonus if completed in < 5 minutes, decreasing after
  const timeSpentMs = endTime.getTime() - startTime.getTime();
  const timeSpentMin = timeSpentMs / (1000 * 60);
  
  let timeBonus = 0;
  if (timeSpentMin < 5) {
    timeBonus = Math.floor(basePoints * 0.5);  // 50% bonus
  } else if (timeSpentMin < 15) {
    timeBonus = Math.floor(basePoints * 0.25);  // 25% bonus
  } else if (timeSpentMin < 30) {
    timeBonus = Math.floor(basePoints * 0.1);  // 10% bonus
  }
  
  // Attempt penalty: -10 points per attempt after the 3rd
  const attemptPenalty = Math.max(0, (attemptCount - 3) * 10);
  
  // Calculate final score (minimum 10% of base)
  const score = basePoints + timeBonus - attemptPenalty;
  return Math.max(Math.floor(basePoints * 0.1), score);
}

/**
 * Get difficulty color class based on level difficulty
 */
export function getDifficultyColor(difficulty: 'easy' | 'medium' | 'hard'): string {
  switch (difficulty) {
    case 'easy':
      return 'text-ctf-easy';
    case 'medium':
      return 'text-ctf-medium';
    case 'hard':
      return 'text-ctf-hard';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Get difficulty badge variant
 */
export function getDifficultyBadge(difficulty: 'easy' | 'medium' | 'hard'): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-ctf-easy/20 text-ctf-easy border-ctf-easy/30';
    case 'medium':
      return 'bg-ctf-medium/20 text-ctf-medium border-ctf-medium/30';
    case 'hard':
      return 'bg-ctf-hard/20 text-ctf-hard border-ctf-hard/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
