"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { calculateSession, formatIDR } from "../../lib/calculation";
import { formatDateID, greeting, timeRange } from "../../lib/format";
import type { SessionStatus } from "../../lib/types";
import { currentUser } from "../../lib/mutations";
import { useApp } from "../../lib/useApp";
import { PlusIcon, XIcon } from "../../components/icons";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  badgeCls,
  btnIcon,
  btnPrimary,
  cardCls,
  pillCls,
  pillState,
} from "../../components/ui";

const FILTERS: { id: SessionStatus | "all"; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "upcoming", label: "Upcoming" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { data, loading, error, removeSession } = useApp();
  const [filter, setFilter] = useState<SessionStatus | "all">("all");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const me = data ? currentUser(data) : null;

  const hapusSesi = async (id: string) => {
    setDeleting(true);
    setDeleteError("");
    try {
      await removeSession(id);
      setPendingDelete(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Gagal menghapus sesi");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (data && !me) router.replace("/login");
  }, [data, me, router]);

  const sessions =
    data?.sessions.filter((s) => filter === "all" || s.status === filter) ?? [];

  if (error) {
    return (
      <main className="py-10">
        <p className="rounded-lg bg-feedback-bg px-3 py-2 text-sm text-error">
          Gagal memuat data: {error}
        </p>
      </main>
    );
  }

  if (loading || !data) {
    return <main className="py-10 text-sm text-fg-muted">Memuat…</main>;
  }

  if (!me) {
    return (
      <main className="py-10 text-sm text-fg-muted">
        Mengalihkan ke halaman masuk…
      </main>
    );
  }

  return (
    <main className="py-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-fg-muted">
            {greeting()},{" "}
            <span className="font-semibold text-fg">{me.name}</span>
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-fg">
            Sesi Badmintonmu
          </h1>
        </div>
        <Link href="/sessions/new" className={`${btnPrimary} shrink-0`}>
          <PlusIcon className="h-4 w-4" />
          Buat Sesi
        </Link>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`${pillCls} ${pillState(filter === f.id)}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sessions.length === 0 && (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-card p-6 text-center text-sm text-fg-subtle">
            Belum ada sesi di filter ini. Yuk buat sesi pertamamu!
          </div>
        )}
        {sessions.map((s) => {
          const calc = calculateSession(s);
          const paid = s.playerIds.filter((p) => s.payments[p] === "paid").length;
          const mine = me ? (calc.perPlayer[me.id]?.total ?? 0) : 0;
          const statusClass =
            s.status === "completed"
              ? "bg-neutral-bg text-primary-dark"
              : s.status === "active"
                ? "bg-primary-bg text-primary-dark"
                : "bg-accent-light text-accent-dark";
          return (
            <Link key={s.id} href={`/sessions/${s.id}`} className={`press ${cardCls}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-fg">{s.name}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    {formatDateID(s.date)} · {timeRange(s.startTime, s.endTime)}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {s.playerIds.length} pemain · {paid}/{s.playerIds.length} lunas
                  </p>
                </div>
                <span className={`${badgeCls} ${statusClass}`}>{s.status}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                <span className="text-fg-muted">
                  Total{" "}
                  <span className="font-semibold text-fg">
                    {formatIDR(calc.totalCost)}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-fg-muted">
                  <span className="font-medium">Tagihanmu</span>
                  <span className="font-semibold text-primary">
                    {formatIDR(mine)}
                  </span>
                  {s.creatorId === me.id && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteError("");
                        setPendingDelete({ id: s.id, name: s.name });
                      }}
                      aria-label={`Hapus sesi ${s.name}`}
                      title="Hapus sesi"
                      className={`btn-delete ${btnIcon} -mr-1.5`}
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  )}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Hapus sesi "${pendingDelete?.name ?? ""}"?`}
        description="Semua lapangan, kok, dan biaya di dalamnya ikut terhapus. Tindakan ini tidak bisa dibatalkan."
        busy={deleting}
        error={deleteError}
        onConfirm={() => {
          if (pendingDelete) void hapusSesi(pendingDelete.id);
        }}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteError("");
        }}
      />
    </main>
  );
}
