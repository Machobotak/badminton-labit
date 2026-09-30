import type {
  AddCost,
  Court,
  PayStatus,
  Session,
  SessionStatus,
  Shuttle,
  User,
} from "./types";

/** Baris `public.profiles` (snake_case, sesuai migration 0001). */
export interface DbProfileRow {
  id: string;
  auth_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Profil pemanggil + emailnya. `email` BUKAN kolom `public.profiles` (lihat
 * migration 0001: kolom duplikat di tabel yang dibaca pemain lain membuatnya
 * bocor lewat `select *`); nilainya diambil dari `auth.users` tiap request.
 */
export type MyProfile = DbProfileRow & { email: string | null };

/** Baris `public.sessions` (snake_case, sesuai migration 0001). */
export interface DbSessionRow {
  id: string;
  creator_id: string | null;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string | null;
  status: string;
  share_code: string;
  player_ids: string[];
  courts: Court[];
  shuttlecocks: Shuttle[];
  additional_costs: AddCost[];
  payments: Record<string, PayStatus>;
  payment_qr: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToUser(
  r: Pick<DbProfileRow, "id" | "name"> & { email?: string | null },
): User {
  return { id: r.id, name: r.name, ...(r.email ? { email: r.email } : {}) };
}

/**
 * Baris jsonb dari DB selalu dianggap tak tepercaya (dan sesi lama masih
 * menyimpan satu harga total, bukan harga slope). Semua bentuk dibaca
 * toleran: slope utuh dianggap berisi 1 butir yang semuanya terpakai.
 */
function normalizeShuttleRows(v: unknown): Shuttle[] {
  if (!Array.isArray(v)) return [];
  return v.map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const num = (x: unknown, fallback: number): number =>
      typeof x === "number" && Number.isFinite(x) ? x : fallback;
    const hasPack = typeof o.packPrice === "number";
    const packSize = Math.max(1, Math.round(num(o.packSize, 1)));
    const legacyPrice = Math.max(0, num(o.price, 0));
    return {
      id: typeof o.id === "string" ? o.id : makeId(),
      name: typeof o.name === "string" ? o.name : "Kok",
      packPrice: hasPack ? Math.max(0, Math.round(num(o.packPrice, 0))) : legacyPrice,
      packSize,
      used: hasPack ? Math.max(0, Math.round(num(o.used, 0))) : packSize,
      playerIds: Array.isArray(o.playerIds)
        ? o.playerIds.filter((x): x is string => typeof x === "string")
        : [],
      ...(typeof o.paidBy === "string" && o.paidBy ? { paidBy: o.paidBy } : {}),
    };
  });
}

export function rowToSession(r: DbSessionRow): Session {
  return {
    id: r.id,
    name: r.name,
    date: r.date,
    startTime: r.start_time ?? "",
    endTime: r.end_time ?? "",
    location: r.location ?? "",
    ...(r.notes ? { notes: r.notes } : {}),
    status: r.status as SessionStatus,
    shareCode: r.share_code,
    playerIds: r.player_ids ?? [],
    courts: Array.isArray(r.courts) ? r.courts : [],
    shuttlecocks: normalizeShuttleRows(r.shuttlecocks),
    additionalCosts: Array.isArray(r.additional_costs)
      ? r.additional_costs
      : [],
    payments: (r.payments ?? {}) as Record<string, PayStatus>,
    ...(r.payment_qr ? { paymentQr: r.payment_qr } : {}),
  };
}

/** Profil pemilik sesi login dari bentuk AppData. */
export function currentUser(d: {
  users: User[];
  currentUserId: string | null;
}): User | null {
  return d.users.find((u) => u.id === d.currentUserId) ?? null;
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return (
    "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)
  );
}

const SHARE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeShareCode(): string {
  let code = "";
  const rand = () =>
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
      : Math.random();
  for (let i = 0; i < 5; i++)
    code += SHARE_CHARS[Math.floor(rand() * SHARE_CHARS.length)];
  return code;
}

// ------------------------------------------------------------ sanitizers
// Dipakai API routes untuk memvalidasi body client sebelum tulis ke DB.
// Prinsip: tolak yang jelas salah (throw), koersi yang wajar (Number, trim).

function cleanStr(v: unknown, max = 200): string {
  if (typeof v !== "string") throw new Error("Nilai harus berupa string");
  const s = v.trim();
  if (s.length > max) throw new Error("Nilai terlalu panjang");
  return s;
}

/** Jumlah bulat ≥ 0; `fallback` dipakai saat field opsional kosong. */
function cleanCount(v: unknown, fallback: number): number {
  if (v === undefined || v === null || v === "") return fallback;
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0)
    throw new Error("Jumlah harus angka ≥ 0");
  return Math.round(n);
}

function cleanMoney(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0)
    throw new Error("Nominal harus angka ≥ 0");
  return Math.round(n);
}

function cleanId(v: unknown): string {
  const s = cleanStr(v, 100);
  if (s.length === 0) throw new Error("ID tidak valid");
  return s;
}

function cleanIdList(v: unknown): string[] {
  if (!Array.isArray(v)) throw new Error("Daftar pemain tidak valid");
  return [...new Set(v.map(cleanId))];
}

export function sanitizeCourts(v: unknown): Court[] {
  if (!Array.isArray(v)) throw new Error("Lapangan tidak valid");
  return v.map((c) => {
    const o = c as Record<string, unknown>;
    return {
      id: typeof o.id === "string" && o.id ? cleanId(o.id) : makeId(),
      name: cleanStr(o.name ?? "Lapangan baru", 120) || "Lapangan baru",
      price: cleanMoney(o.price),
      playerIds: Array.isArray(o.playerIds) ? cleanIdList(o.playerIds) : [],
      ...(typeof o.paidBy === "string" && o.paidBy
        ? { paidBy: cleanId(o.paidBy) }
        : {}),
    };
  });
}

/**
 * Kok disimpan sebagai pembelian per slope, bukan harga total per item:
 * `packPrice` = harga 1 slope, `packSize` = isi 1 slope, `used` = butir terpakai.
 * Harga per butir dihitung `calculateSession`, tidak pernah disimpan.
 */
export function sanitizeShuttles(v: unknown): Shuttle[] {
  if (!Array.isArray(v)) throw new Error("Kok tidak valid");
  return v.map((k) => {
    const o = k as Record<string, unknown>;
    const packSize = cleanCount(o.packSize, 1);
    if (packSize < 1) throw new Error("Isi 1 slope minimal 1 butir");
    return {
      id: typeof o.id === "string" && o.id ? cleanId(o.id) : makeId(),
      name: cleanStr(o.name ?? "Kok baru", 120) || "Kok baru",
      packPrice: cleanMoney(o.packPrice),
      packSize,
      used: cleanCount(o.used, 0),
      playerIds: Array.isArray(o.playerIds) ? cleanIdList(o.playerIds) : [],
      ...(typeof o.paidBy === "string" && o.paidBy
        ? { paidBy: cleanId(o.paidBy) }
        : {}),
    };
  });
}

/**
 * Draft dari wizard "Buat Sesi": kok belum dipakai siapa pun, jadi
 * `used` + `playerIds` diisi kosong oleh `sanitizeShuttles`.
 */
export function sanitizeShuttleDrafts(
  draft: { name: string; packPrice: number; packSize: number }[],
): Shuttle[] {
  return sanitizeShuttles(
    draft.map((k) => ({
      name: k.name,
      packPrice: k.packPrice,
      packSize: k.packSize,
      used: 0,
    })),
  );
}

export function sanitizeAdds(v: unknown): AddCost[] {
  if (!Array.isArray(v)) throw new Error("Biaya tambahan tidak valid");
  return v.map((a) => {
    const o = a as Record<string, unknown>;
    return {
      id: typeof o.id === "string" && o.id ? cleanId(o.id) : makeId(),
      name: cleanStr(o.name ?? "-", 120) || "-",
      category: cleanStr(o.category ?? "Lainnya", 60) || "Lainnya",
      amount: cleanMoney(o.amount),
    };
  });
}

export function sanitizePayments(v: unknown): Record<string, PayStatus> {
  if (typeof v !== "object" || v === null || Array.isArray(v))
    throw new Error("Payments tidak valid");
  const out: Record<string, PayStatus> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (val !== "pending" && val !== "paid")
      throw new Error("Status bayar tidak valid");
    out[cleanId(k)] = val;
  }
  return out;
}

export function sanitizeStatus(v: unknown): SessionStatus {
  if (v !== "upcoming" && v !== "active" && v !== "completed")
    throw new Error("Status sesi tidak valid");
  return v;
}

/**
 * Hapus pemain + cascade dari court/kok + payment entry + paidBy.
 * Mirror `removePlayer` store lama (plus: paidBy yang dangling ikut dibersihkan).
 */
export function cascadeRemovePlayer(s: Session, playerId: string): Session {
  return {
    ...s,
    playerIds: s.playerIds.filter((id) => id !== playerId),
    courts: s.courts.map((c) => {
      const { paidBy, ...rest } = c;
      return {
        ...rest,
        playerIds: c.playerIds.filter((id) => id !== playerId),
        ...(paidBy && paidBy !== playerId ? { paidBy } : {}),
      };
    }),
    shuttlecocks: s.shuttlecocks.map((k) => {
      const { paidBy, ...rest } = k;
      return {
        ...rest,
        playerIds: k.playerIds.filter((id) => id !== playerId),
        ...(paidBy && paidBy !== playerId ? { paidBy } : {}),
      };
    }),
    payments: Object.fromEntries(
      Object.entries(s.payments).filter(([pid]) => pid !== playerId),
    ) as Record<string, PayStatus>,
  };
}
