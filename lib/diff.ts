import type { Session } from "./types";
import type { SessionPatch } from "./api";

/** Field Session yang boleh dikirim lewat PATCH /api/sessions/[id]. */
const PATCHABLE = [
  "name",
  "date",
  "startTime",
  "endTime",
  "location",
  "notes",
  "status",
  "playerIds",
  "courts",
  "shuttlecocks",
  "additionalCosts",
  "payments",
  "paymentQr",
] as const satisfies readonly (keyof Session)[];

/**
 * Bandingkan dua Session → patch minimal untuk API, atau `null` bila identik.
 * `paymentQr` yang dihapus dikirim `null` karena `undefined` dibuang JSON.stringify.
 */
export function diffPatch(before: Session, after: Session): SessionPatch | null {
  const patch: Record<string, unknown> = {};
  for (const f of PATCHABLE) {
    if (JSON.stringify(before[f]) !== JSON.stringify(after[f])) {
      patch[f] = after[f];
    }
  }
  if ("paymentQr" in patch && patch.paymentQr === undefined) {
    patch.paymentQr = null;
  }
  if (Object.keys(patch).length === 0) return null;
  // Nilai tiap field berasal dari Session, jadi bentuknya cocok SessionPatch.
  return patch as SessionPatch;
}
