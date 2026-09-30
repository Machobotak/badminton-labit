import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { User } from "@/lib/types";
import {
  err,
  serverError,
  sessionPayload,
} from "@/lib/server-helpers";
import type { DbSessionRow } from "@/lib/db";

/**
 * Preview publik sesi dari kode share (untuk halaman /s/<code> sebelum login).
 * Memakai service_role untuk melewati RLS — hanya data yang memang
 * ditampilkan di halaman undangan yang dikembalikan.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const admin = createServiceRoleClient();
    // `eq` pada kode yang dinormalkan uppercase — bukan `ilike`, supaya `%`/_ dari
    // URL tidak berubah jadi wildcard dan membocorkan sesi tanpa kode yang benar.
    const { data, error } = await admin
      .from("sessions")
      .select("*")
      .eq("share_code", code.trim().toUpperCase())
      .maybeSingle();
    if (error) throw error;
    if (!data) return err("Sesi tidak ditemukan", 404);
    const row: DbSessionRow = data;
    const payload = await sessionPayload(row);
    const users: User[] = payload.users;
    return Response.json({ session: payload.session, users });
  } catch (e) {
    return serverError(e);
  }
}
