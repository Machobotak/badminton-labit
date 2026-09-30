import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSession,
  shuttleItemCost,
  shuttleUnitPrice,
} from "./calculation.ts";
import type { Session, Shuttle } from "./types.ts";

const kok = (over: Partial<Shuttle> = {}): Shuttle => ({
  id: "k1",
  name: "Kok A",
  packPrice: 111000,
  packSize: 12,
  used: 2,
  playerIds: [],
  ...over,
});

const session = (shuttlecocks: Shuttle[], playerIds: string[]): Session => ({
  id: "s1",
  name: "Badminton",
  date: "2026-10-02",
  startTime: "19:00",
  endTime: "21:00",
  location: "GOR A",
  status: "upcoming",
  shareCode: "8FK29",
  playerIds,
  courts: [],
  shuttlecocks,
  additionalCosts: [],
  payments: {},
});

test("shuttleUnitPrice divides the slope price by its size", () => {
  assert.equal(shuttleUnitPrice({ packPrice: 111000, packSize: 12 }), 9250);
  // Isi 0 tidak mungkin, tapi jangan sampai bagi nol.
  assert.equal(shuttleUnitPrice({ packPrice: 9000, packSize: 0 }), 9000);
});

test("shuttleItemCost charges only the pieces actually used", () => {
  assert.equal(shuttleItemCost({ packPrice: 111000, packSize: 12, used: 12 }), 111000);
  assert.equal(shuttleItemCost({ packPrice: 111000, packSize: 12, used: 2 }), 18500);
  assert.equal(shuttleItemCost({ packPrice: 111000, packSize: 12, used: 0 }), 0);
  // Terpakai pecahan dibulatkan ke butir utuh.
  assert.equal(shuttleItemCost({ packPrice: 111000, packSize: 12, used: 2.4 }), 18500);
});

test("calculateSession splits shuttle cost from used pieces across players", () => {
  // Cerita user: 4 orang main, 2 butir terpakai dari slope Rp111.000 isi 12.
  const calc = calculateSession(
    session([kok({ used: 2, playerIds: ["p1", "p2", "p3", "p4"] })], ["p1", "p2", "p3", "p4"]),
  );
  assert.equal(calc.totalCost, 18500);
  assert.equal(calc.allocatedTotal, 18500);
  assert.equal(calc.unallocated, 0);
  for (const pid of ["p1", "p2", "p3", "p4"]) {
    assert.deepEqual(calc.perPlayer[pid], {
      court: 0,
      shuttle: 4625,
      additional: 0,
      total: 4625,
    });
  }
});

test("calculator keeps rounding remainder inside the group", () => {
  // 1 butir = 9250 untuk 4 orang → 2312.5; sisa Rp2 dibebankan ke id urut awal.
  const calc = calculateSession(
    session([kok({ used: 1, playerIds: ["p4", "p3", "p2", "p1"] })], ["p1", "p2", "p3", "p4"]),
  );
  assert.equal(calc.allocatedTotal, 9250);
  assert.equal(calc.perPlayer.p1.shuttle, 2313);
  assert.equal(calc.perPlayer.p2.shuttle, 2313);
  assert.equal(calc.perPlayer.p3.shuttle, 2312);
  assert.equal(calc.perPlayer.p4.shuttle, 2312);
});

test("unassigned or unused kok stays unallocated", () => {
  const calc = calculateSession(session([kok({ used: 12 })], ["p1"]));
  assert.equal(calc.totalCost, 111000);
  assert.equal(calc.perPlayer.p1.shuttle, 0);
  assert.equal(calc.unallocated, 111000);
});
