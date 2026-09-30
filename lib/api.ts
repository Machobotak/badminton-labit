import type { Session, User } from "./types";

/** Bentuk data yang dipertahankan agar diff halaman tetap mekanis. */
export interface AppData {
  /** Profil pemain yang terlihat (id + nama saja; tanpa email). */
  users: User[];
  sessions: Session[];
  currentUserId: string | null;
  /** Email pemilik sesi login, dari `/api/me`. `users[]` tidak lagi memuatnya. */
  currentUserEmail: string | null;
}

/** Field Session yang boleh dikirim ke PATCH /api/sessions/[id]. */
export type SessionPatch = Partial<
  Pick<
    Session,
    | "name"
    | "date"
    | "startTime"
    | "endTime"
    | "location"
    | "notes"
    | "status"
    | "playerIds"
    | "courts"
    | "shuttlecocks"
    | "additionalCosts"
    | "payments"
  >
> & { paymentQr?: string | null };

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message = `Request gagal (${res.status})`;
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      message = body.error;
    }
    throw new ApiError(res.status, message);
  }
  return body as T;
}

export const api = {
  me: () => req<{ user: User }>("/api/me"),
  updateMe: (name: string) =>
    req<{ user: User }>("/api/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  listSessions: () =>
    req<{ sessions: Session[]; users: User[] }>("/api/sessions"),

  createSession: (body: {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    notes?: string;
    playerNames: string[];
    courts: { name: string; price: number }[];
    shuttlecocks: { name: string; packPrice: number; packSize: number }[];
    additionalCosts: { name: string; category: string; amount: number }[];
  }) =>
    req<{ session: Session }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patchSession: (id: string, patch: SessionPatch) =>
    req<{ session: Session }>(`/api/sessions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  addPlayer: (id: string, name: string) =>
    req<{ user: User; session: Session }>(
      `/api/sessions/${encodeURIComponent(id)}/players`,
      { method: "POST", body: JSON.stringify({ name }) },
    ),

  previewByCode: (code: string) =>
    req<{ session: Session; users: User[] }>(
      `/api/sessions/by-code/${encodeURIComponent(code)}`,
    ),

  joinByCode: (code: string) =>
    req<{ session: Session }>(
      `/api/sessions/by-code/${encodeURIComponent(code)}/join`,
      { method: "POST" },
    ),
};
