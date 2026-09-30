"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { calculateSession, formatIDR } from "../../lib/calculation";
import { formatDateID, greeting, timeRange } from "../../lib/format";
import type { SessionStatus } from "../../lib/types";
import { currentUser } from "../../lib/mutations";
import { useApp } from "../../lib/useApp";
import { PlusIcon } from "../../components/icons";

const FILTERS: { id: SessionStatus | "all"; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "upcoming", label: "Upcoming" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { data, loading, error } = useApp();
  const [filter, setFilter] = useState<SessionStatus | "all">("all");
  const me = data ? currentUser(data) : null;

  useEffect(() => {
    if (data && !me) router.replace("/login");
  }, [data, me, router]);

  const sessions =
    data?.sessions.filter((s) => filter === "all" || s.status === filter) ?? [];

  if (error) {
    return (
      <main className="py-10 text-sm text-coral">
        Gagal memuat data: {error}
      </main>
    );
  }

  if (loading || !data) {
    return <main className="py-10 text-sm text-primary-dark/70">Memuat…</main>;
  }

  if (!me) {
    return <main className="py-10 text-sm text-primary-dark/70">Mengalihkan ke halaman masuk…</main>;
  }

  return (
    <main className="py-6 md:py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary-dark/70">
            {greeting()},{" "}
            <span className="font-semibold text-primary-dark">
              {me?.name ?? "…"}
            </span>
          </p>
          <h1 className="text-xl font-extrabold text-primary-dark">Sesi Badmintonmu</h1>
        </div>
        <Link
          href="/sessions/new"
          className="press inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-accent-light to-accent px-6 py-3 text-sm font-extrabold text-on-accent shadow-accent-glow"
        >
          <PlusIcon className="h-4 w-4" />
          Buat Sesi
        </Link>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`press whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-bold ${
              filter === f.id
                ? "bg-primary text-white shadow-teal-glow"
                : "bg-primary-bg text-primary-dark"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sessions.length === 0 && (
          <div className="rounded-lg bg-primary-bg p-6 text-center text-sm text-primary-dark/60">
            Belum ada sesi di filter ini. Yuk buat sesi pertamamu!
          </div>
        )}
        {sessions.map((s) => {
          const calc = calculateSession(s);
          const paid = s.playerIds.filter((p) => s.payments[p] === "paid").length;
          const mine = me ? (calc.perPlayer[me.id]?.total ?? 0) : 0;
          return (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="block rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-extrabold text-primary-dark">{s.name}</p>
                  <p className="mt-0.5 text-xs text-primary-dark/70">
                    {formatDateID(s.date)} · {timeRange(s.startTime, s.endTime)}
                  </p>
                  <p className="mt-0.5 text-xs text-primary-dark/70">
                    {s.playerIds.length} pemain · {paid}/{s.playerIds.length} lunas
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                    s.status === "completed"
                      ? "bg-primary-bg text-primary-dark"
                      : s.status === "active"
                        ? "bg-primary-light text-primary-dark"
                        : "bg-accent-light text-accent-dark"
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-primary-light/40 pt-3 text-sm">
                <span className="text-primary-dark/70">
                  Total <span className="font-semibold text-primary-dark">{formatIDR(calc.totalCost)}</span>
                </span>
                <span className="text-primary-dark/70">
                  Tagihanmu{" "}
                  <span className="font-extrabold text-primary">{formatIDR(mine)}</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
