import type { AppData } from "./api";

export { currentUser } from "./db";

/**
 * Mutasi murni atas `AppData` — dipakai halaman di dalam `useApp().update(fn)`,
 * yang kemudian menyinkronkan diff-nya ke API. Tanpa I/O.
 */

export function togglePaid(d: AppData, sessionId: string, playerId: string): void {
  const s = d.sessions.find((x) => x.id === sessionId);
  if (!s) return;
  s.payments[playerId] = s.payments[playerId] === "paid" ? "pending" : "paid";
}

/** Hapus pemain + cascade dari court/kok + payment entry + paidBy dangling. */
export function removePlayer(
  d: AppData,
  sessionId: string,
  playerId: string,
): void {
  const s = d.sessions.find((x) => x.id === sessionId);
  if (!s) return;
  s.playerIds = s.playerIds.filter((id) => id !== playerId);
  for (const c of s.courts) {
    c.playerIds = c.playerIds.filter((id) => id !== playerId);
    if (c.paidBy === playerId) delete c.paidBy;
  }
  for (const k of s.shuttlecocks) {
    k.playerIds = k.playerIds.filter((id) => id !== playerId);
    if (k.paidBy === playerId) delete k.paidBy;
  }
  delete s.payments[playerId];
}
