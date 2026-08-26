import type { Draw } from "../types";
import { supabase } from "./supabase";

export interface DbProfile {
  id: string;
  username: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToDraw(row: any): Draw {
  return {
    id: String(row.id),
    userEmail: String(row.user_id),
    drawDate: String(row.draw_date),
    cardName: String(row.card_name),
    adjective: String(row.adjective),
    noun: String(row.noun),
    score: Number(row.score),
    category: String(row.category),
    comment: String(row.comment),
  };
}

export async function fetchProfile(userId: string): Promise<DbProfile | null> {
  const { data, error } = await supabase!
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, username: data.username ?? "" } : null;
}

export async function saveUsername(
  userId: string,
  username: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase!
    .from("profiles")
    .update({ username })
    .eq("id", userId);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That username is already taken." };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function fetchDraws(userId: string): Promise<Draw[]> {
  const { data, error } = await supabase!
    .from("draws")
    .select("*")
    .eq("user_id", userId)
    .order("draw_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToDraw);
}

export async function saveDrawDb(draw: Draw, userId: string): Promise<void> {
  const { error } = await supabase!.from("draws").insert({
    user_id: userId,
    draw_date: draw.drawDate,
    card_name: draw.cardName,
    adjective: draw.adjective,
    noun: draw.noun,
    score: draw.score,
    category: draw.category,
    comment: draw.comment,
  });
  if (error) {
    if (error.code === "23505") throw new Error("already-drawn");
    throw error;
  }
}

export async function deleteDrawForDate(userId: string, dateUtc: string): Promise<void> {
  const { error } = await supabase!
    .from("draws")
    .delete()
    .eq("user_id", userId)
    .eq("draw_date", dateUtc);
  if (error) throw error;
}

/**
 * Copies guest cards the account is still missing (first sign-in migration
 * and any cards drawn as guest between sessions). Duplicate dates are
 * ignored at the database level.
 */
export async function migrateGuestDraws(
  userId: string,
  guestDraws: Draw[]
): Promise<void> {
  if (guestDraws.length === 0) return;
  const existing = await fetchDraws(userId);
  const dates = new Set(existing.map((d) => d.drawDate));
  const missing = guestDraws.filter((d) => !dates.has(d.drawDate));
  if (missing.length === 0) return;
  const rows = missing.map((d) => ({
    user_id: userId,
    draw_date: d.drawDate,
    card_name: d.cardName,
    adjective: d.adjective,
    noun: d.noun,
    score: d.score,
    category: d.category,
    comment: d.comment,
  }));
  const { error } = await supabase!.from("draws").upsert(rows, {
    onConflict: "user_id,draw_date",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}
