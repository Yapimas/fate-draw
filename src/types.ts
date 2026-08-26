export interface Profile {
  /** Supabase user id — undefined for guest/demo identities. */
  id?: string;
  email: string;
  username: string;
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
}

export interface CommentCategory {
  range: [number, number];
  comments: string[];
}

export const CATEGORY_EMOJI: Record<string, string> = {
  Disaster: "💀",
  Bad: "😬",
  Neutral: "😐",
  Good: "✨",
  Legendary: "👑",
  "Absolute Fate": "🌟",
};

export function categorySlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}
