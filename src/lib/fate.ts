import adjectives from "../data/adjectives.json";
import nouns from "../data/nouns.json";
import commentsJson from "../data/comments.json";
import type { CommentCategory, Draw } from "../types";
import { getTodayUTC, shiftUtcDate } from "./utc";

const COMMENTS = commentsJson as unknown as Record<string, CommentCategory>;

/** Base XP per rarity tier. */
export const BASE_XP: Record<string, number> = {
  Disaster: 10,
  Bad: 20,
  Neutral: 30,
  Good: 50,
  Legendary: 100,
  "Absolute Fate": 200,
};

/** Streak multiplier thresholds. */
export const STREAK_MULTIPLIERS: Array<{ minStreak: number; multiplier: number }> = [
  { minStreak: 14, multiplier: 2.0 },
  { minStreak: 7, multiplier: 1.5 },
  { minStreak: 3, multiplier: 1.25 },
  { minStreak: 0, multiplier: 1.0 },
];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function rollScore(): number {
  return Math.floor(Math.random() * 101); // 0–100 inclusive
}

// Ranges come straight from comments.json, checked in declaration order.
export function categoryForScore(score: number): string {
  for (const [name, def] of Object.entries(COMMENTS)) {
    const [lo, hi] = def.range;
    if (score >= lo && score <= hi) return name;
  }
  return "Neutral";
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateDraw(userEmail: string): Draw {
  const adjective = pick(adjectives);
  const noun = pick(nouns);
  const score = rollScore();
  const category = categoryForScore(score);
  const comment = pick(COMMENTS[category]?.comments ?? ["The stars are shy today."]);
  return {
    id: uid(),
    userEmail,
    drawDate: getTodayUTC(),
    cardName: `${adjective} ${noun}`,
    adjective,
    noun,
    score,
    category,
    comment,
  };
}

// Consecutive days ending today — or yesterday, if today isn't drawn yet.
export function computeStreak(dates: Set<string>, todayUtc: string): number {
  let cursor = todayUtc;
  if (!dates.has(cursor)) {
    const yesterday = shiftUtcDate(todayUtc, -1);
    if (!dates.has(yesterday)) return 0;
    cursor = yesterday;
  }
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = shiftUtcDate(cursor, -1);
  }
  return streak;
}

/** Get streak multiplier for XP gain. */
export function getStreakMultiplier(streak: number): number {
  for (const { minStreak, multiplier } of STREAK_MULTIPLIERS) {
    if (streak >= minStreak) return multiplier;
  }
  return 1.0;
}

/** Calculate XP gain for a draw based on category and streak. */
export function calculateXpGain(category: string, streak: number): number {
  const base = BASE_XP[category] ?? BASE_XP.Neutral;
  const multiplier = getStreakMultiplier(streak);
  return Math.round(base * multiplier);
}