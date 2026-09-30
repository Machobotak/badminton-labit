import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import {
  rowToSession,
  rowToUser,
  type DbProfileRow,
  type DbSessionRow,
  type MyProfile,
} from "./db";
import { ConfigError } from "./supabase/config";
import { createServiceRoleClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import type { Session, User } from "./types";

/** Error validasi input client → diterjemahkan jadi 400 oleh route. */
export class BadRequest extends Error {}

export function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function serverError(e: unknown) {
  if (e instanceof ConfigError) return err(e.message, 503);
  console.error(e);
  return err("Terjadi kesalahan server", 500);
}

export async function requireUser(): Promise<{
  supabase: SupabaseClient;
  user: AuthUser | null;
}> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

function displayNameOf(user: AuthUser): string {
  const meta = user.user_metadata;
  if (meta && typeof meta === "object" && "name" in meta) {
    const n = meta.name;
    if (typeof n === "string" && n.trim().length > 0) return n.trim();
  }
  if (user.email) {
    const prefix = user.email.split("@")[0].trim();
    if (prefix) return prefix;
  }
  return "Pemain";
}

/**
 * Profil milik user auth. Normalnya sudah dibuat trigger `handle_new_user`;
 * fallback insert di sini menutup race trigger.
 * `email` TIDAK dibaca dari `public.profiles` (kolom itu sudah tidak ada) —
 * satu-satunya sumber email adalah `auth.users`, dan nilai itu disisipkan ke
 * `DbProfileRow` secara eksplisit agar `/api/me` tetap menampilkannya.
 */
export async function myProfile(
  supabase: SupabaseClient,
  user: AuthUser,
): Promise<MyProfile> {
  // `select *` aman di sini: barisnya baris sendiri (RLS profiles_select_own)
  // dan tabelnya sudah tidak punya kolom email.
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    const row: Omit<MyProfile, "email"> = data;
    return { ...row, email: user.email ?? null };
  }
  const created = await supabase
    .from("profiles")
    .insert({ id: user.id, auth_id: user.id, name: displayNameOf(user) })
    .select("*")
    .single();
  if (created.error || !created.data)
    throw new Error("Gagal menyiapkan profil");
  const row: Omit<MyProfile, "email"> = created.data;
  return { ...row, email: user.email ?? null };
}

/** Ambil satu baris session. null = tidak ada / bukan anggota (RLS). */
export async function getSessionRow(
  supabase: SupabaseClient,
  id: string,
): Promise<DbSessionRow | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row: DbSessionRow = data;
  return row;
}

/**
 * Session + profil semua pemainnya (untuk resolve nama di client).
 *
 * Nama pemain LAIN selalu dibaca lewat service_role: policy
 * `profiles_select_own` hanya mengizinkan pemanggil melihat barisnya sendiri,
 * jadi `select` biasa akan mengembalikan satu baris lalu semua nama hilang.
 * Yang dikirim keluar hanya `id` + `name` — payload ini juga sampai ke
 * pengunjung anonim lewat /s/<code>.
 */
export async function sessionPayload(
  row: DbSessionRow,
): Promise<{ session: Session; users: User[] }> {
  const ids = Array.isArray(row.player_ids) ? row.player_ids : [];
  let users: User[] = [];
  if (ids.length > 0) {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, name")
      .in("id", ids);
    if (error) throw error;
    const rows: Pick<DbProfileRow, "id" | "name">[] = data ?? [];
    users = rows.map(rowToUser);
  }
  return { session: rowToSession(row), users };
}

/** Parse body JSON jadi record polos; throw BadRequest bila bukan objek. */
export async function readBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const v: unknown = await request.json().catch(() => null);
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new BadRequest("Body harus berupa objek JSON");
  }
  const rec: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) rec[k] = val;
  return rec;
}

export function reqStr(
  rec: Record<string, unknown>,
  key: string,
  max = 200,
): string {
  const v = rec[key];
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new BadRequest(`Field "${key}" wajib diisi`);
  }
  if (v.trim().length > max) {
    throw new BadRequest(`Field "${key}" terlalu panjang`);
  }
  return v.trim();
}

export function optStr(
  rec: Record<string, unknown>,
  key: string,
  max = 500,
): string | null {
  const v = rec[key];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") {
    throw new BadRequest(`Field "${key}" harus berupa string`);
  }
  const s = v.trim();
  if (s.length > max) {
    throw new BadRequest(`Field "${key}" terlalu panjang`);
  }
  return s.length === 0 ? null : s;
}

export function reqIdList(rec: Record<string, unknown>, key: string): string[] {
  const v = rec[key];
  if (!Array.isArray(v)) {
    throw new BadRequest(`Field "${key}" harus berupa array`);
  }
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new BadRequest(`Field "${key}" berisi ID tidak valid`);
    }
    if (item.trim().length > 100) {
      throw new BadRequest(`Field "${key}" berisi ID tidak valid`);
    }
    out.push(item.trim());
  }
  return [...new Set(out)];
}

/**
 * Pastikan semua id ada di tabel profiles; throw BadRequest bila ada yang asing.
 * Memakai service_role: `profiles_select_own` menyembunyikan baris pemain lain
 * dari pemanggil, jadi client user hanya akan "menemukan" satu baris.
 */
export async function assertProfilesExist(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .in("id", ids);
  if (error) throw error;
  const found: { id: string }[] = data ?? [];
  if (found.length !== ids.length) {
    throw new BadRequest("Ada pemain yang tidak dikenal");
  }
}
