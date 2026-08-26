import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || "fate-draw-secret-change-in-production";
const JWT_EXPIRES_IN = "30d";
const BCRYPT_ROUNDS = 12;

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

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokens(payload: Omit<JWTPayload, "iat" | "exp">): AuthTokens {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { accessToken, refreshToken };
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
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

export function setAuthCookies(accessToken: string, refreshToken: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `auth_token=${accessToken}; path=/; max-age=900; SameSite=Lax; Secure`;
  document.cookie = `refresh_token=${refreshToken}; path=/; max-age=2592000; SameSite=Lax; Secure`;
}

export function clearAuthCookies(): void {
  if (typeof document === "undefined") return;
  document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax; Secure";
  document.cookie = "refresh_token=; path=/; max-age=0; SameSite=Lax; Secure";
}

export function getStoredRefreshToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/);
  return match ? match[1] : null;
}