import type { Session } from "./types";

export interface PlayerShare {
  court: number;
  shuttle: number;
  additional: number;
  total: number;
}

export interface SessionCalc {
  perPlayer: Record<string, PlayerShare>;
  totalCost: number;
  allocatedTotal: number;
  unallocated: number;
}

function emptyShare(): PlayerShare {
  return { court: 0, shuttle: 0, additional: 0, total: 0 };
}

/**
 * Bagi rata amount ke userIds dengan sisa (+1 rupiah) ke user pertama
 * setelah diurutkan ascending. Menjamin jumlah hasil == amount selalu.
 */
export function splitEqual(
  amount: number,
  userIds: string[],
): Record<string, number> {
  if (userIds.length === 0) return {};
  const sorted = [...userIds].sort();
  const n = sorted.length;
  const base = Math.floor(amount / n);
  const remainder = amount - base * n;
  const out: Record<string, number> = {};
  sorted.forEach((id, i) => {
    out[id] = base + (i < remainder ? 1 : 0);
  });
  return out;
}

export function calculateSession(s: Session): SessionCalc {
  const perPlayer: Record<string, PlayerShare> = {};
  for (const pid of s.playerIds) perPlayer[pid] = emptyShare();

  let totalCost = 0;

  const addSplit = (
    price: number,
    targets: string[],
    field: "court" | "shuttle" | "additional",
  ) => {
    const split = splitEqual(price, targets);
    for (const [pid, v] of Object.entries(split)) {
      if (!perPlayer[pid]) perPlayer[pid] = emptyShare();
      perPlayer[pid][field] += v;
    }
  };

  for (const c of s.courts) {
    totalCost += c.price;
    addSplit(c.price, c.playerIds, "court");
  }
  for (const k of s.shuttlecocks) {
    totalCost += k.price;
    addSplit(k.price, k.playerIds, "shuttle");
  }
  for (const a of s.additionalCosts) {
    totalCost += a.amount;
    addSplit(a.amount, s.playerIds, "additional");
  }

  let allocatedTotal = 0;
  for (const pid of Object.keys(perPlayer)) {
    const p = perPlayer[pid];
    p.total = p.court + p.shuttle + p.additional;
    allocatedTotal += p.total;
  }

  return {
    perPlayer,
    totalCost,
    allocatedTotal,
    unallocated: totalCost - allocatedTotal,
  };
}

export function formatIDR(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}
