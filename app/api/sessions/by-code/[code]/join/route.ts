import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  BadRequest,
  err,
  myProfile,
  requireUser,
  serverError,
  sessionPayload,
} from "@/lib/server-helpers";
import type { DbSessionRow } from "@/lib/db";
import type { PayStatus } from "@/lib/types";

/**
 * Join sesi via kode share. Mirror `joinSession` store lama:
 * tambahkan profil user ke player_ids + payments "pending" bila belum ada.
 * Memakai service_role karena user belum tentu anggota (RLS akan menolak).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const { supabase, user } = await requireUser();
    if (!user) return err("Belum login", 401);
    const me = await myProfile(supabase, user);

    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("sessions")
      .select("*")
      .eq("share_code", code.trim().toUpperCase())
      .maybeSingle();
    if (error) throw error;
    if (!data) return err("Sesi tidak ditemukan", 404);
    const row: DbSessionRow = data;

    if (!row.player_ids.includes(me.id)) {
      const payments: Record<string, PayStatus> = {
        ...row.payments,
        [me.id]: row.payments[me.id] ?? "pending",
      };
      const updated = await admin
        .from("sessions")
        .update({
          player_ids: [...row.player_ids, me.id],
          payments,
        })
        .eq("id", row.id)
        .select("*")
        .single();
      if (updated.error || !updated.data)
        throw updated.error ?? new Error("Gagal join sesi");
      const fresh: DbSessionRow = updated.data;
      return Response.json({ session: (await sessionPayload(fresh)).session });
    }

    return Response.json({ session: (await sessionPayload(row)).session });
  } catch (e) {
    if (e instanceof BadRequest) return err(e.message);
    return serverError(e);
  }
}
