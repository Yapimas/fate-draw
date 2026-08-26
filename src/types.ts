export interface Profile {
  /** Supabase user id — undefined for guest/demo identities. */
  id?: string;
  email: string;
  username: string;
  xp: number;
  level: number;
  totalDraws: number;
}

export interface Draw {
  id: string;
  userEmail: string;
  drawDate: string; // YYYY-MM-DD in UTC
  cardName: string;
  adjective: string;
  noun: string;
  score: number;
  category: string;
  comment: string;
  /** Collection series tracking */
  seriesLevel?: number;
  seriesCount?: number;
}

export interface CommentCategory {
  range: [number, number];
  comments: string[];
}

export interface CardSeries {
  cardKey: string; // `${cardName}|${category}`
  cardName: string;
  category: string;
  count: number;
  level: number;
  maxCount: number;
  bonusXpAwarded: number;
}

export const CATEGORY_EMOJI: Record<string, string> = {
  Disaster: "💀",
  Bad: "😬",
  Neutral: "😐",
  Good: "✨",
  Legendary: "👑",
  "Absolute Fate": "🌟",
};

export const CATEGORY_RARITY_ORDER: string[] = [
  "Absolute Fate",
  "Legendary",
  "Good",
  "Neutral",
  "Bad",
  "Disaster",
];

export function categorySlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

export function getCategoryRarityIndex(category: string): number {
  return CATEGORY_RARITY_ORDER.indexOf(category);
}

/** Series thresholds: level 1 needs 3, level 2 needs 6, level 3 needs 10, etc. */
export function getSeriesThreshold(level: number): number {
  // Level 1: 3, Level 2: 6, Level 3: 10, Level 4: 15, Level 5: 21, etc.
  // Formula: triangular numbers + 2 = n(n+1)/2 + 2
  return Math.floor(level * (level + 1) / 2) + 2;
}

/** Bonus XP for completing a series level */
export function getSeriesBonusXp(category: string, level: number): number {
  const baseXp: Record<string, number> = {
    Disaster: 5,
    Bad: 10,
    Neutral: 15,
    Good: 25,
    Legendary: 50,
    "Absolute Fate": 100,
  };
  const base = baseXp[category] ?? baseXp.Neutral;
  return base * level; // Scales with level
}