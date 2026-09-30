import {
  BadRequest,
  err,
  getSessionRow,
  readBody,
  requireUser,
  serverError,
  sessionPayload,
} from "@/lib/server-helpers";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { rowToUser, type DbProfileRow } from "@/lib/db";

/**
 * Tambah pemain ke sesi.
 * - `{ name }`      → buat profil tamu adhoc (auth_id null) lalu tambahkan.
 * - `{ profileId }` → tambahkan profil yang sudah ada.
 * Mirror `addPlayer`/`joinSession` store lama: tambah ke player_ids +
 * payments "pending" bila belum ada.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireUser();
    if (!user) return err("Belum login", 401);
    const row = await getSessionRow(supabase, id);
    if (!row) return err("Sesi tidak ditemukan", 404);

    const body = await readBody(request);
    const rawProfileId = body.profileId;
    const rawName = body.name;

    let profile: Pick<DbProfileRow, "id" | "name">;
    if (typeof rawProfileId === "string" && rawProfileId.trim()) {
      // `profiles_select_own` menyembunyikan pemain lain dari client user,
      // maka lookup profil memakai service_role.
      const admin = createServiceRoleClient();
      const { data, error } = await admin
        .from("profiles")
        .select("id, name")
        .eq("id", rawProfileId.trim())
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new BadRequest("Pemain tidak ditemukan");
      const found: Pick<DbProfileRow, "id" | "name"> = data;
      profile = found;
    } else if (typeof rawName === "string" && rawName.trim()) {
      // Tamu baru (`auth_id` null) juga lewat service_role: dengan RLS aktif,
      // INSERT ... RETURNING dari client user ditolak policy SELECT
      // `profiles_select_own` (error 42501) dan barisnya ikut rollback.
      const res = await createServiceRoleClient()
        .from("profiles")
        .insert({
          id: crypto.randomUUID(),
          auth_id: null,
          name: rawName.trim().slice(0, 60),
        })
        .select("id, name")
        .single();
      if (res.error || !res.data)
        throw res.error ?? new Error("Gagal membuat pemain");
      const created: Pick<DbProfileRow, "id" | "name"> = res.data;
      profile = created;
    } else {
      throw new BadRequest("Nama pemain wajib diisi");
    }

    // Sudah tergabung: idempoten, cukup kembalikan state sekarang.
    if (row.player_ids.includes(profile.id)) {
      const payload = await sessionPayload(row);
      return Response.json({ user: rowToUser(profile), session: payload.session });
    }

    const playerIds = [...row.player_ids, profile.id];
    const payments = { ...row.payments, [profile.id]: "pending" as const };
    const { data, error } = await supabase
      .from("sessions")
      .update({ player_ids: playerIds, payments })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Gagal menambah pemain");

    const payload = await sessionPayload(data);
    return Response.json(
      { user: rowToUser(profile), session: payload.session },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof BadRequest) return err(e.message);
    return serverError(e);
  }
}
