import type { Draw, Profile } from "../types";

interface Store {
  users: Record<string, Profile>; // keyed by normalized email
  draws: Draw[];
}

const STORE_KEY = "fatedraw.store.v1";
const SESSION_KEY = "fatedraw.session.v1";

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

/* ---------------- sessions ---------------- */

function ensureGuest(): Profile {
  const store = readStore();
  if (!store.users[GUEST_EMAIL]) {
    store.users[GUEST_EMAIL] = { email: GUEST_EMAIL, username: "Wanderer" };
    writeStore(store);
  }
  localStorage.setItem(SESSION_KEY, GUEST_EMAIL);
  return store.users[GUEST_EMAIL];
}

/** Start (or resume) an anonymous play-through. */
export function startAsGuest(): Profile {
  return ensureGuest();
}

/**
 * Demo mode: pretend to send a magic-link email.
 * A real deployment would call an auth backend here; the UI flow is identical:
 * enter email -> receive link -> tap link -> signed in.
 */
export function sendMagicLink(email: string): string {
  return normalizeEmail(email);
}

/** Simulates the user tapping the link in their inbox. */
export function consumeMagicLink(email: string): Profile | null {
  const key = normalizeEmail(email);
  const previous = localStorage.getItem(SESSION_KEY);
  const store = readStore();

  // One-time migration: fold the guest's cards into the freshly signed-in
  // account so nobody loses a streak or collection by creating an account.
  if (previous === GUEST_EMAIL && key !== GUEST_EMAIL) {
    const accountDates = new Set(
      store.draws.filter((d) => d.userEmail === key).map((d) => d.drawDate)
    );
    for (const d of store.draws) {
      if (d.userEmail === GUEST_EMAIL && !accountDates.has(d.drawDate)) {
        store.draws.push({ ...d, id: `${key}-${d.id}`, userEmail: key });
      }
    }
    store.draws = store.draws.filter((d) => d.userEmail !== GUEST_EMAIL);
    delete store.users[GUEST_EMAIL];
  }

  if (!store.users[key]) {
    store.users[key] = { email: key, username: "" };
  }
  writeStore(store);
  localStorage.setItem(SESSION_KEY, key);
  return store.users[key];
}

export function getSession(): Profile | null {
  const key = localStorage.getItem(SESSION_KEY);
  if (!key) return null;
  return readStore().users[key] ?? null;
}

export function setUsername(
  email: string,
  rawUsername: string
): Profile | { error: string } {
  const username = rawUsername.trim();
  if (!isValidUsername(username)) {
    return { error: "Usernames are 3–16 characters: letters, numbers and underscore." };
  }
  const key = normalizeEmail(email);
  const store = readStore();
  const user = store.users[key];
  if (!user) return { error: "Session expired — please sign in again." };
  const taken = Object.values(store.users).some(
    (u) => u.email !== key && u.username.toLowerCase() === username.toLowerCase()
  );
  if (taken) return { error: "That username is already taken." };
  user.username = username;
  store.users[key] = user;
  writeStore(store);
  return user;
}

/** Leaving an account drops you back into the anonymous guest slot. */
export function signOut(): Profile {
  localStorage.removeItem(SESSION_KEY);
  return ensureGuest();
}

/* ---------------- draws ---------------- */

export function getTodayDraw(email: string, todayUtc: string): Draw | null {
  const key = normalizeEmail(email);
  return (
    readStore().draws.find((d) => d.userEmail === key && d.drawDate === todayUtc) ??
    null
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
