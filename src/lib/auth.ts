export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

/** Client-side password hashing using Web Crypto API (SHA-256). */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Not used client-side — kept for API compatibility. */
export async function verifyPassword(_password: string, _hash: string): Promise<boolean> {
  return false;
}

/** Not used client-side — tokens are handled by Supabase. */
export function generateTokens(_payload: Omit<JWTPayload, "iat" | "exp">): AuthTokens {
  return { accessToken: "", refreshToken: "" };
}

/** Not used client-side. */
export function verifyToken(_token: string): JWTPayload | null {
  return null;
}

export function parseAuthHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? match[1] : null;
}

export function setAuthCookies(_accessToken: string, _refreshToken: string): void {
  // Handled by Supabase client
}

export function clearAuthCookies(): void {
  // Handled by Supabase client
}

export function getStoredRefreshToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/);
  return match ? match[1] : null;
}