import assert from "node:assert/strict";
import test from "node:test";
import {
  cascadeRemovePlayer,
  rowToSession,
  rowToUser,
  sanitizeAdds,
  sanitizeCourts,
  sanitizePayments,
  sanitizeShuttles,
  sanitizeStatus,
  type DbSessionRow,
} from "./db.ts";
import type { Session } from "./types.ts";

const row: DbSessionRow = {
  id: "s1",
  creator_id: "p1",
  name: "Badminton Jumat Malam",
  date: "2026-10-02",
  start_time: "19:00",
  end_time: "21:00",
  location: "GOR A",
  notes: null,
  status: "upcoming",
  share_code: "8FK29",
  player_ids: ["p1", "p2"],
  courts: [{ id: "c1", name: "Court 1", price: 120000, playerIds: ["p1", "p2"] }],
  shuttlecocks: [{ id: "k1", name: "Kok A", packPrice: 111000, packSize: 12, used: 2, playerIds: ["p1"] }],
  additional_costs: [{ id: "a1", name: "Parkir", category: "Parkir", amount: 10000 }],
  payments: { p1: "paid", p2: "pending" },
  payment_qr: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

test("rowToSession maps snake_case row into the client Session shape", () => {
  const s = rowToSession(row);
  assert.equal(s.shareCode, "8FK29");
  assert.equal(s.startTime, "19:00");
  assert.deepEqual(s.playerIds, ["p1", "p2"]);
  assert.deepEqual(s.additionalCosts, [
    { id: "a1", name: "Parkir", category: "Parkir", amount: 10000 },
  ]);
  assert.equal(s.creatorId, "p1");
  assert.deepEqual(s.payments, { p1: "paid", p2: "pending" });
  assert.equal("paymentQr" in s, false);
  assert.equal("notes" in s, false);
  assert.equal("creatorId" in rowToSession({ ...row, creator_id: "" }), false);
});

test("rowToSession carries optional notes and payment_qr when present", () => {
  const s = rowToSession({ ...row, notes: "bawa air", payment_qr: "data:image/png;base64,AA" });
  assert.equal(s.notes, "bawa air");
  assert.equal(s.paymentQr, "data:image/png;base64,AA");
});

test("rowToUser keeps a supplied email and omits an empty one", () => {
  assert.deepEqual(
    rowToUser({ id: "p1", name: "Ayub", email: "ayub@example.com" }),
    { id: "p1", name: "Ayub", email: "ayub@example.com" },
  );
  assert.deepEqual(rowToUser({ id: "p1", name: "Ayub", email: null }), {
    id: "p1",
    name: "Ayub",
  });
  // Pemain lain: hanya id + name, tidak pernah ada email.
  assert.deepEqual(rowToUser({ id: "p2", name: "Budi" }), {
    id: "p2",
    name: "Budi",
  });
});

test("cascadeRemovePlayer drops the player from every reference", () => {
  const base = rowToSession(row);
  const s: Session = {
    ...base,
    courts: [{ ...base.courts[0], paidBy: "p2" }],
    shuttlecocks: [{ ...base.shuttlecocks[0], paidBy: "p2" }],
  };
  const out = cascadeRemovePlayer(s, "p2");
  assert.deepEqual(out.playerIds, ["p1"]);
  assert.deepEqual(out.courts[0].playerIds, ["p1"]);
  assert.equal(out.courts[0].paidBy, undefined);
  assert.equal(out.shuttlecocks[0].paidBy, undefined);
  assert.deepEqual(out.payments, { p1: "paid" });
  // Pemain lain tetap utuh.
  assert.deepEqual(cascadeRemovePlayer(s, "p1").playerIds, ["p2"]);
});

test("sanitizers coerce numbers and reject malformed payloads", () => {
  assert.deepEqual(sanitizeCourts([{ id: "c1", name: " Court 1 ", price: "120000", playerIds: ["p1"] }]), [
    { id: "c1", name: "Court 1", price: 120000, playerIds: ["p1"] },
  ]);
  assert.deepEqual(
    sanitizeShuttles([{ id: "k1", name: "Kok", packPrice: "111000.4", packSize: "12", used: "2.6", playerIds: [] }]),
    [{ id: "k1", name: "Kok", packPrice: 111000, packSize: 12, used: 3, playerIds: [] }],
  );
  // Field opsional absen: isi slope default 1, terpakai default 0.
  assert.deepEqual(sanitizeShuttles([{ id: "k1", name: "Kok", packPrice: 9000 }]), [
    { id: "k1", name: "Kok", packPrice: 9000, packSize: 1, used: 0, playerIds: [] },
  ]);
  assert.throws(() => sanitizeShuttles([{ name: "Kok", packPrice: 9000, packSize: 0 }]));
  assert.throws(() => sanitizeShuttles([{ name: "Kok", packPrice: -1, packSize: 12 }]));
  assert.throws(() => sanitizeCourts([{ id: "c1", name: "X", price: -1, playerIds: [] }]));
  assert.throws(() => sanitizeCourts("nope"));
  assert.throws(() => sanitizeAdds([{ id: "a1", name: "X", category: "Y", amount: NaN }]));
  assert.deepEqual(sanitizePayments({ p1: "paid", p2: "pending" }), { p1: "paid", p2: "pending" });
  assert.throws(() => sanitizePayments({ p1: "lunas" }));
  assert.equal(sanitizeStatus("active"), "active");
  assert.throws(() => sanitizeStatus("batal"));
});
