import type { Draw, Profile } from "../types";
import { getCategoryRarityIndex } from "../types";

interface Store {
  users: Record<string, UserRecord>; // keyed by normalized email
  draws: Draw[];
}

interface UserRecord extends Profile {
  passwordHash: string;
}

const STORE_KEY = "fatedraw.store.v2";
const SESSION_KEY = "fatedraw.session.v2";

/** Pseudo-account used when someone plays without signing in. */
export const GUEST_EMAIL = "guest";

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    // corrupted storage — start clean
  }
  return { users: {}, draws: [] };
}

function writeStore(store: Store): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidUsername(username: string): boolean {
  return /^[A-Za-z0-9_]{3,16}$/.test(username);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

/* ---------------- sessions ---------------- */

function ensureGuest(): Profile {
  const store = readStore();
  if (!store.users[GUEST_EMAIL]) {
    store.users[GUEST_EMAIL] = {
      email: GUEST_EMAIL,
      username: "Wanderer",
      passwordHash: "",
      xp: 0,
      level: 1,
      totalDraws: 0,
    };
    writeStore(store);
  }
  localStorage.setItem(SESSION_KEY, GUEST_EMAIL);
  return store.users[GUEST_EMAIL];
}

/** Start (or resume) an anonymous play-through. */
export function startAsGuest(): Profile {
  return ensureGuest();
}

/** Register a new user with email, username and password. */
export function registerUser(
  email: string,
  username: string,
  passwordHash: string
): Profile | { error: string } {
  const key = normalizeEmail(email);
  const store = readStore();

  if (store.users[key]) {
    return { error: "An account with this email already exists." };
  }

  const usernameTrimmed = username.trim();
  if (!isValidUsername(usernameTrimmed)) {
    return { error: "Usernames are 3–16 characters: letters, numbers and underscore." };
  }

  const taken = Object.values(store.users).some(
    (u) => u.username.toLowerCase() === usernameTrimmed.toLowerCase()
  );
  if (taken) return { error: "That username is already taken." };

  const newUser: UserRecord = {
    email: key,
    username: usernameTrimmed,
    passwordHash,
    xp: 0,
    level: 1,
    totalDraws: 0,
  };

  store.users[key] = newUser;
  writeStore(store);
  localStorage.setItem(SESSION_KEY, key);
  return { email: key, username: usernameTrimmed, xp: 0, level: 1, totalDraws: 0 };
}

/** Verify credentials and return profile if valid. */
export function loginUser(email: string, passwordHash: string): Profile | { error: string } {
  const key = normalizeEmail(email);
  const store = readStore();
  const user = store.users[key];

  if (!user) {
    return { error: "Invalid email or password." };
  }

  if (user.passwordHash !== passwordHash) {
    return { error: "Invalid email or password." };
  }

  localStorage.setItem(SESSION_KEY, key);
  return {
    email: user.email,
    username: user.username,
    xp: user.xp,
    level: user.level,
    totalDraws: user.totalDraws,
  };
}

/** Get current session profile. */
export function getSession(): Profile | null {
  const key = localStorage.getItem(SESSION_KEY);
  if (!key) return null;
  const store = readStore();
  const user = store.users[key];
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return {
    email: user.email,
    username: user.username,
    xp: user.xp,
    level: user.level,
    totalDraws: user.totalDraws,
  };
}

/** Leaving an account drops you back into the anonymous guest slot. */
export function signOut(): Profile {
  localStorage.removeItem(SESSION_KEY);
  return ensureGuest();
}

/** Update username for the current session user. */
export function setUsername(email: string, username: string): Profile | { error: string } {
  const key = normalizeEmail(email);
  const store = readStore();
  const user = store.users[key];

  if (!user) return { error: "User not found." };

  const usernameTrimmed = username.trim();
  if (!isValidUsername(usernameTrimmed)) {
    return { error: "Usernames are 3–16 characters: letters, numbers and underscore." };
  }

  const taken = Object.values(store.users).some(
    (u) => u.username.toLowerCase() === usernameTrimmed.toLowerCase() && u.email !== key
  );
  if (taken) return { error: "That username is already taken." };

  user.username = usernameTrimmed;
  writeStore(store);
  return {
    email: user.email,
    username: user.username,
    xp: user.xp,
    level: user.level,
    totalDraws: user.totalDraws,
  };
}

/* ---------------- draws ---------------- */

export function getTodayDraw(email: string, todayUtc: string): Draw | null {
  const key = normalizeEmail(email);
  return (
    readStore().draws.find((d) => d.userEmail === key && d.drawDate === todayUtc) ?? null
  );
}

export function getAllDraws(email: string): Draw[] {
  const key = normalizeEmail(email);
  return readStore()
    .draws.filter((d) => d.userEmail === key)
    .sort((a, b) => b.drawDate.localeCompare(a.drawDate));
}

export function getUserDrawDates(email: string): Set<string> {
  const key = normalizeEmail(email);
  return new Set(
    readStore()
      .draws.filter((d) => d.userEmail === key)
      .map((d) => d.drawDate)
  );
}

export function saveDraw(draw: Draw): void {
  const store = readStore();
  const exists = store.draws.some(
    (d) => d.userEmail === draw.userEmail && d.drawDate === draw.drawDate
  );
  if (exists) throw new Error("A card was already drawn today.");
  store.draws.push(draw);

  // Update user stats
  const key = normalizeEmail(draw.userEmail);
  const user = store.users[key];
  if (user) {
    user.totalDraws += 1;
  }

  writeStore(store);
}

/** Testing helper: forget today's card so a fresh ceremony can run. */
export function deleteDrawsForDate(email: string, dateUtc: string): void {
  const key = normalizeEmail(email);
  const store = readStore();
  store.draws = store.draws.filter(
    (d) => !(d.userEmail === key && d.drawDate === dateUtc)
  );
  writeStore(store);
}

export function getAllDrawsByEmail(email: string): Draw[] {
  return getAllDraws(email);
}

export function getUserDrawDatesByEmail(email: string): Set<string> {
  return getUserDrawDates(email);
}

/* ---------------- XP & Level ---------------- */

export function addXp(email: string, xpGain: number): { xp: number; level: number; leveledUp: boolean } {
  const key = normalizeEmail(email);
  const store = readStore();
  const user = store.users[key];

  if (!user) return { xp: 0, level: 1, leveledUp: false };

  user.xp += xpGain;

  // Calculate new level: level = floor((xp / 100)^(2/3)) + 1 roughly
  // Using formula: required XP = 100 * level^1.5
  let newLevel = 1;
  while (user.xp >= 100 * Math.pow(newLevel + 1, 1.5)) {
    newLevel++;
  }

  const leveledUp = newLevel > user.level;
  user.level = newLevel;
  writeStore(store);

  return { xp: user.xp, level: user.level, leveledUp };
}

export function getXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function getXpForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level + 1, 1.5));
}

/* ---------------- Leaderboard ---------------- */

export interface LeaderboardEntry {
  username: string;
  cardName: string;
  score: number;
  category: string;
  drawDate: string;
}

export function getDailyLeaderboard(dateUtc: string, limit = 50): LeaderboardEntry[] {
  const store = readStore();
  const todaysDraws = store.draws.filter((d) => d.drawDate === dateUtc);

  // Sort by rarity (category) first, then by score
  const sorted = todaysDraws.sort((a, b) => {
    const rarityA = getCategoryRarityIndex(a.category);
    const rarityB = getCategoryRarityIndex(b.category);
    if (rarityA !== rarityB) return rarityA - rarityB;
    return b.score - a.score;
  });

  return sorted.slice(0, limit).map((d) => {
    const user = store.users[d.userEmail];
    return {
      username: user?.username ?? "Unknown",
      cardName: d.cardName,
      score: d.score,
      category: d.category,
      drawDate: d.drawDate,
    };
  });
}