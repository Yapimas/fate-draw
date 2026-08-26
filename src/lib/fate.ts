import adjectives from "../data/adjectives.json";
import nouns from "../data/nouns.json";
import commentsJson from "../data/comments.json";
import type { CommentCategory, Draw } from "../types";
import { getTodayUTC, shiftUtcDate } from "./utc";

const COMMENTS = commentsJson as unknown as Record<string, CommentCategory>;

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
