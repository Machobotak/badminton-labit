import type { PayStatus, User } from "@/lib/types";
import {
  BadRequest,
  err,
  myProfile,
  optStr,
  readBody,
  reqStr,
  requireUser,
  serverError,
} from "@/lib/server-helpers";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  makeShareCode,
  rowToSession,
  rowToUser,
  sanitizeAdds,
  sanitizeCourts,
  sanitizeShuttleDrafts,
  type DbProfileRow,
  type DbSessionRow,
} from "@/lib/db";

function reqPlayerNames(body: Record<string, unknown>): string[] {
  const v = body.playerNames;
  if (!Array.isArray(v)) throw new BadRequest("playerNames harus berupa array");
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new BadRequest("Nama pemain tidak valid");
    }
    if (item.trim().length > 100) {
      throw new BadRequest("Nama pemain terlalu panjang");
    }
    out.push(item.trim());
  }
  return out;
}

function reqDraftItems(
  body: Record<string, unknown>,
  key: "courts" | "shuttlecocks",
): { name: string; price: number }[] {
  const v = body[key];
  if (!Array.isArray(v)) throw new BadRequest(`${key} harus berupa array`);
  return v.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new BadRequest(`${key} berisi item tidak valid`);
    }
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const rawPrice = typeof rec.price === "string" ? Number(rec.price) : rec.price;
    if (typeof rawPrice !== "number" || !Number.isFinite(rawPrice) || rawPrice < 0) {
      throw new BadRequest(`Harga ${key} tidak valid`);
    }
    return { name: name || key, price: Math.round(rawPrice) };
  });
}

function reqDraftShuttles(
  body: Record<string, unknown>,
): { name: string; packPrice: number; packSize: number }[] {
  const v = body.shuttlecocks;
  if (!Array.isArray(v)) throw new BadRequest("shuttlecocks harus berupa array");
  return v.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new BadRequest("shuttlecocks berisi item tidak valid");
    }
    const rec = item as Record<string, unknown>;
    const num = (raw: unknown): number =>
      typeof raw === "string" ? Number(raw) : (raw as number);
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const packPrice = num(rec.packPrice);
    if (typeof packPrice !== "number" || !Number.isFinite(packPrice) || packPrice < 0) {
      throw new BadRequest("Harga 1 slope kok tidak valid");
    }
    const packSize = num(rec.packSize);
    if (typeof packSize !== "number" || !Number.isFinite(packSize) || packSize < 1) {
      throw new BadRequest("Isi 1 slope kok minimal 1 butir");
    }
    return {
      name: name || "Kok",
      packPrice: Math.round(packPrice),
      packSize: Math.round(packSize),
    };
  });
}

function reqDraftAdds(body: Record<string, unknown>): {
  name: string;
  category: string;
  amount: number;
}[] {
  const v = body.additionalCosts;
  if (!Array.isArray(v)) return [];
  return v.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new BadRequest("Biaya tambahan tidak valid");
    }
    const rec = item as Record<string, unknown>;
    const amount =
      typeof rec.amount === "string" ? Number(rec.amount) : rec.amount;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      throw new BadRequest("Nominal biaya tidak valid");
    }
    return {
      name: (typeof rec.name === "string" ? rec.name.trim() : "") || "-",
      category:
        (typeof rec.category === "string" ? rec.category.trim() : "") ||
        "Lainnya",
      amount: Math.round(amount),
    };
  });
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return err("Belum login", 401);
    const profile = await myProfile(supabase, user);
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .or(`creator_id.eq.${profile.id},player_ids.cs.{${profile.id}}`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows: DbSessionRow[] = data ?? [];
    // Kumpulkan semua profil pemain dari seluruh sesi (1 query), lalu
    // pastikan profil pemanggil ikut terkirim walau ia belum punya sesi —
    // `currentUser()` di client mencari id-nya di dalam daftar ini.
    const allIds = [
      ...new Set([...rows.flatMap((r) => r.player_ids ?? []), profile.id]),
    ];
    let users: User[] = [];
    if (allIds.length > 0) {
      // `profiles_select_own` menyembunyikan pemain lain dari client user,
      // jadi daftar nama diambil lewat service_role (hanya `id` + `name`).
      const { data: profiles, error: pErr } = await createServiceRoleClient()
        .from("profiles")
        .select("id, name")
        .in("id", allIds);
      if (pErr) throw pErr;
      const pRows: Pick<DbProfileRow, "id" | "name">[] = profiles ?? [];
      users = pRows.map(rowToUser);
    }
    return Response.json({
      sessions: rows.map(rowToSession),
      users,
    });
  } catch (e) {
    if (e instanceof BadRequest) return err(e.message);
    return serverError(e);
  }
}

/**
 * Buat sesi baru. Mirror wizard lama:
 * - players[0] = kreator (profil sendiri)
 * - sisanya = tamu adhoc (baris profiles baru, auth_id null)
 * - courts/shuttles/adds diberi id fresh
 * - lapangan & kok langsung ditugaskan ke SEMUA pemain sesi: wizard tidak
 *   punya langkah penugasan, jadi tanpa ini tagihan per orang = Rp0 dan
 *   seluruh biaya lapangan tampil sebagai "belum terbagi" tepat setelah sesi
 *   dibuat. Penugasan tetap bisa diubah di tab Lapangan/Kok halaman detail.
 * - payments semua "pending"
 */
export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return err("Belum login", 401);
    const mine = await myProfile(supabase, user);
    const body = await readBody(request);
    const name = reqStr(body, "name", 120);
    const date = reqStr(body, "date", 20);
    const startTime = optStr(body, "startTime", 10) ?? "";
    const endTime = optStr(body, "endTime", 10) ?? "";
    const location = optStr(body, "location", 160) ?? "";
    const notes = optStr(body, "notes", 1000);
    const playerNames = reqPlayerNames(body);
    const draftCourts = reqDraftItems(body, "courts");
    const draftShuttles = reqDraftShuttles(body);
    const draftAdds = reqDraftAdds(body);

    const addList = sanitizeAdds(
      draftAdds.map((a) => ({
        name: a.name,
        category: a.category,
        amount: a.amount,
      })),
    );

    const playerIds: string[] = [mine.id];
    const namesToCreate =
      playerNames.length === 0
        ? []
        : playerNames[0].toLowerCase() === mine.name.toLowerCase()
          ? playerNames.slice(1)
          : playerNames;
    for (const n of namesToCreate) {
      // Tamu adhoc (`auth_id` null) lewat service_role: `insert(...).select()`
      // dari client user ditolak policy SELECT `profiles_select_own` (42501)
      // dan barisnya ikut rollback.
      const { data, error } = await createServiceRoleClient()
        .from("profiles")
        .insert({ id: crypto.randomUUID(), auth_id: null, name: n })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Gagal membuat pemain");
      const created: Pick<DbProfileRow, "id"> = data;
      playerIds.push(created.id);
    }

    // Lapangan & kok ditugaskan ke SEMUA pemain sesi: wizard tidak punya
    // langkah penugasan, jadi tanpa ini tagihan per orang = Rp0 dan seluruh
    // biaya lapangan tampil "belum terbagi" tepat setelah sesi dibuat.
    const courtList = sanitizeCourts(
      draftCourts.map((c) => ({ name: c.name, price: c.price, playerIds })),
    );
    const shuttleList = sanitizeShuttleDrafts(draftShuttles, playerIds);

    const payments: Record<string, PayStatus> = {};
    for (const pid of playerIds) payments[pid] = "pending";

    // share_code: coba ulang max 3x bila kebetulan bentrok (unique constraint).
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          creator_id: mine.id,
          name,
          date,
          start_time: startTime,
          end_time: endTime,
          location,
          notes,
          status: "upcoming",
          share_code: makeShareCode(),
          player_ids: playerIds,
          courts: courtList,
          shuttlecocks: shuttleList,
          additional_costs: addList,
          payments,
        })
        .select("*")
        .single();
      if (!error && data) {
        const row: DbSessionRow = data;
        return Response.json({ session: rowToSession(row) }, { status: 201 });
      }
      const msg = error ? error.message + error.code : "";
      if (!/unique|duplicate|23505/i.test(msg) || attempt === 2) {
        throw error ?? new Error("Gagal membuat sesi");
      }
    }
    throw new Error("Gagal membuat sesi");
  } catch (e) {
    if (e instanceof BadRequest) return err(e.message);
    return serverError(e);
  }
}
