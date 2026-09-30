import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { missingEnv } from "./config";

/**
 * Client service_role (bypass RLS). Server-only!
 *
 * Dipakai untuk dua hal yang memang tidak bisa dilakukan client user:
 * 1. baca/tulis sesi lewat kode share sebelum user jadi anggota;
 * 2. baca profil pemain LAIN (policy `profiles_select_own` sengaja hanya
 *    mengizinkan baris sendiri) — dipakai `sessionPayload` untuk merakit nama
 *    pemain, `assertProfilesExist`, dan insert tamu adhoc.
 *
 * Karena bypass RLS, setiap pemakaian wajib memastikan sendiri bahwa pemanggil
 * berhak: route sudah memvalidasi keanggotaan sesi / hanya mengembalikan
 * `id` + `name`.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    throw missingEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
