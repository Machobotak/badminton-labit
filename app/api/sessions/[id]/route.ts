import type { Court, PayStatus, Session, Shuttle } from "@/lib/types";
import {
  BadRequest,
  assertProfilesExist,
  err,
  reqIdList,
  requireUser,
  serverError,
  sessionPayload,
  getSessionRow,
  readBody,
  optStr,
} from "@/lib/server-helpers";
import {
  cascadeRemovePlayer,
  rowToSession,
  sanitizeAdds,
  sanitizeCourts,
  sanitizePayments,
  sanitizeShuttles,
  sanitizeStatus,
} from "@/lib/db";

const MAX_QR_BYTES = 700 * 1024;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireUser();
    if (!user) return err("Belum login", 401);
    // RLS: baris hanya terlihat oleh kreator/peserta.
    const row = await getSessionRow(supabase, id);
    if (!row) return err("Sesi tidak ditemukan", 404);
    return Response.json(await sessionPayload(row));
  } catch (e) {
    if (e instanceof BadRequest) return err(e.message);
    return serverError(e);
  }
}

/** Update sebagian session. Member (kreator/peserta) diizinkan oleh RLS. */
export async function PATCH(
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
    const patch: Record<string, unknown> = {};
    let courts: Court[] | undefined;
    let shuttles: Shuttle[] | undefined;
    let payments: Record<string, PayStatus> | undefined;

    if ("name" in body) {
      const v = optStr(body, "name", 120);
      if (!v) throw new BadRequest("Nama sesi tidak boleh kosong");
      patch.name = v;
    }
    if ("date" in body) {
      const v = optStr(body, "date", 20);
      if (!v) throw new BadRequest("Tanggal tidak boleh kosong");
      patch.date = v;
    }
    if ("startTime" in body) patch.start_time = optStr(body, "startTime", 10) ?? "";
    if ("endTime" in body) patch.end_time = optStr(body, "endTime", 10) ?? "";
    if ("location" in body) patch.location = optStr(body, "location", 160) ?? "";
    if ("notes" in body) patch.notes = optStr(body, "notes", 1000);
    if ("status" in body) patch.status = sanitizeStatus(body.status);
    if ("courts" in body) {
      courts = sanitizeCourts(body.courts);
      patch.courts = courts;
    }
    if ("shuttlecocks" in body) {
      shuttles = sanitizeShuttles(body.shuttlecocks);
      patch.shuttlecocks = shuttles;
    }
    if ("additionalCosts" in body)
      patch.additional_costs = sanitizeAdds(body.additionalCosts);
    if ("payments" in body) {
      payments = sanitizePayments(body.payments);
      patch.payments = payments;
    }
    if ("paymentQr" in body) {
      const v = body.paymentQr;
      if (v === null || v === "") {
        patch.payment_qr = null;
      } else if (typeof v === "string") {
        if (!v.startsWith("data:image/"))
          throw new BadRequest("QR harus berupa data-URL gambar");
        if (v.length > MAX_QR_BYTES)
          throw new BadRequest("Gambar QR terlalu besar");
        patch.payment_qr = v;
      } else {
        throw new BadRequest("QR tidak valid");
      }
    }

    // Bila playerIds dikirim: validasi keberadaan + cascade bersihkan referensi
    // yang menunjuk ke pemain yang dihapus (mirror `removePlayer` store lama).
    if ("playerIds" in body) {
      const ids = reqIdList(body, "playerIds");
      await assertProfilesExist(ids);
      patch.player_ids = ids;
      const removed = row.player_ids.filter((pid) => !ids.includes(pid));
      if (removed.length > 0) {
        let cleaned: Session = {
          ...rowToSession(row),
          playerIds: ids,
          courts: courts ?? row.courts,
          shuttlecocks: shuttles ?? row.shuttlecocks,
          payments: payments ?? row.payments,
        };
        for (const pid of removed) cleaned = cascadeRemovePlayer(cleaned, pid);
        patch.player_ids = cleaned.playerIds;
        patch.courts = cleaned.courts;
        patch.shuttlecocks = cleaned.shuttlecocks;
        patch.payments = cleaned.payments;
      }
    }

    if (Object.keys(patch).length === 0)
      throw new BadRequest("Tidak ada perubahan");

    const { data, error } = await supabase
      .from("sessions")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Gagal menyimpan sesi");
    return Response.json(await sessionPayload(data));
  } catch (e) {
    if (e instanceof BadRequest) return err(e.message);
    return serverError(e);
  }
}
