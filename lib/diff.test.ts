import assert from "node:assert/strict";
import test from "node:test";
import { diffPatch } from "./diff.ts";
import type { Session } from "./types.ts";

const base: Session = {
  id: "s1",
  name: "Badminton",
  date: "2026-10-02",
  startTime: "19:00",
  endTime: "21:00",
  location: "GOR A",
  status: "upcoming",
  shareCode: "8FK29",
  playerIds: ["p1", "p2"],
  courts: [{ id: "c1", name: "Court 1", price: 120000, playerIds: ["p1", "p2"] }],
  shuttlecocks: [{ id: "k1", name: "Kok A", packPrice: 111000, packSize: 12, used: 2, playerIds: ["p1"] }],
  additionalCosts: [{ id: "a1", name: "Parkir", category: "Parkir", amount: 10000 }],
  payments: { p1: "paid", p2: "pending" },
};

test("diffPatch returns null when nothing changed", () => {
  assert.equal(diffPatch(base, structuredClone(base)), null);
});

test("diffPatch sends only changed fields", () => {
  const after: Session = { ...structuredClone(base), name: "Badminton Sabtu" };
  assert.deepEqual(diffPatch(base, after), { name: "Badminton Sabtu" });
});

test("diffPatch sends nested changes and playerIds together", () => {
  const after = structuredClone(base);
  after.courts[0].price = 150000;
  after.playerIds = ["p1"];
  delete after.payments.p2;
  assert.deepEqual(diffPatch(base, after), {
    playerIds: ["p1"],
    courts: [{ id: "c1", name: "Court 1", price: 150000, playerIds: ["p1", "p2"] }],
    payments: { p1: "paid" },
  });
});

test("diffPatch maps removed paymentQr to null (undefined is dropped by JSON)", () => {
  const withQr: Session = { ...base, paymentQr: "data:image/png;base64,AA" };
  assert.deepEqual(diffPatch(withQr, structuredClone(base)), { paymentQr: null });
});
