"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { calculateSession, formatIDR } from "../../../lib/calculation";
import { formatDateID, timeRange } from "../../../lib/format";
import { api } from "../../../lib/api";
import { createClient } from "../../../lib/supabase/client";
import type { Session, User } from "../../../lib/types";
import { AlertIcon, ArrowLeftIcon, QrIcon, ReceiptIcon, ShuttlecockIcon } from "../../../components/icons";
import { QrImage } from "../../../components/QrImage";
import { btnPrimary, cardCls, scoreCls } from "../../../components/ui";
export default function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    void params.then((p) => setCode(p.code));
  }, [params]);
  return code ? (
    <JoinBody code={code} />
  ) : (
    <main className="py-10 text-sm text-fg-muted">Memuat…</main>
  );
}

function JoinBody({ code }: { code: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Rantai promise: setState hanya jalan di callback async, dan `createClient()`
  // yang melempar ConfigError pun tertangkap tanpa setState sinkron di effect.
  const load = useCallback(
    () =>
      Promise.resolve()
        .then(() => createClient().auth.getUser())
        .then(({ data }) => {
          setMeId(data.user?.id ?? null);
          return api.previewByCode(code);
        })
        .then((preview) => {
          setSession(preview.session);
          setUsers(preview.users);
          setState("ready");
        })
        .catch(() => setState("missing")),
    [code],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading")
    return <main className="py-10 text-sm text-fg-muted">Memuat…</main>;

  if (state === "missing" || !session)
    return (
      <main className="py-10 text-center">
        <p className="font-semibold text-fg">Kode {code} tidak ditemukan</p>
        <p className="mt-1 text-sm text-fg-muted">Minta link baru ke pembuat sesi.</p>
        <Link
          href="/dashboard"
          className="press mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Dashboard
        </Link>
      </main>
    );

  const me = meId ? users.find((u) => u.id === meId) ?? null : null;
  const calc = calculateSession(session);
  const already = meId ? session.playerIds.includes(meId) : false;
  // Tagihan orang yang membuka halaman ini, plus status lunasnya. Halaman
  // undangan boleh dibuka tanpa login, jadi keduanya `undefined`/`false`
  // untuk tamu — bukan syarat render.
  const mine = me ? calc.perPlayer[me.id] : undefined;
  const minePaid = me ? session.payments[me.id] === "paid" : false;

  const join = async () => {
    if (!meId) {
      router.push(`/login?next=/s/${code}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.joinByCode(code);
      router.push(`/sessions/${res.session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal join sesi");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-md py-10 md:py-16">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-card px-3 py-1 text-xs font-medium text-fg-muted">
        <ShuttlecockIcon className="h-4 w-4 text-primary" />
        Undangan Sesi
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fg">
        {session.name}
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        {formatDateID(session.date)} · {timeRange(session.startTime, session.endTime)} · {session.location}
      </p>

      <section aria-label="Ringkasan sesi" className={`${cardCls} mt-5`}>
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <span className="text-sm text-fg-muted">Total biaya</span>
          <span className="text-lg font-semibold text-fg tabular-nums">{formatIDR(calc.totalCost)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border py-3">
          <span className="text-sm text-fg-muted">Pemain</span>
          <span className="text-sm font-medium text-fg tabular-nums">{session.playerIds.length} orang</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-3">
          <span className="text-sm text-fg-muted">Status</span>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-fg capitalize">
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${session.status === "active" ? "bg-success" : session.status === "upcoming" ? "bg-primary" : "bg-fg-subtle"}`}
            />
            {session.status}
          </span>
        </div>
        <p className="mt-3 text-xs font-medium text-fg-muted">Pemain saat ini</p>
        <p className="mt-1 text-sm text-fg">{session.playerIds.map((pid) => users.find((u) => u.id === pid)?.name ?? "?").join(", ")}</p>
      </section>

      {mine && (
        <section
          aria-label="Tagihanmu"
          className={`${scoreCls} mt-3 p-5`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white/85">Tagihanmu</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-fg">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${minePaid ? "bg-success" : "bg-warning"}`}
              />
              {minePaid ? "Lunas" : "Belum bayar"}
            </span>
          </div>
          <p key={mine.total} className="tnum animate-score-snap mt-1 text-4xl font-semibold tracking-tight">
            {formatIDR(mine.total)}
          </p>
          <p className="mt-1 text-sm text-white/80">
            {mine.court > 0 && `Lapangan ${formatIDR(mine.court)}`}
            {mine.shuttle > 0 && `${mine.court > 0 ? " · " : ""}Kok ${formatIDR(mine.shuttle)}`}
            {mine.additional > 0 && `${mine.court > 0 || mine.shuttle > 0 ? " · " : ""}Lain ${formatIDR(mine.additional)}`}
          </p>
        </section>
      )}

      <section aria-label="Tagihan per orang" className={`${cardCls} mt-3`}>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <ReceiptIcon className="h-5 w-5 text-primary" /> Tagihan per Orang
        </p>
        <div className="mt-3 divide-y divide-border border-y border-border">
          {session.playerIds.map((pid) => {
            const share = calc.perPlayer[pid];
            const paid = session.payments[pid] === "paid";
            return (
              <div
                key={pid}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="text-sm font-medium text-fg">
                  {users.find((u) => u.id === pid)?.name ?? "?"}
                  {pid === meId && <span className="text-fg-subtle"> (kamu)</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-fg tabular-nums">
                    {formatIDR(share?.total ?? 0)}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${paid ? "bg-success" : "bg-warning"}`}
                  />
                  <span className="sr-only">{paid ? "Lunas" : "Belum bayar"}</span>
                </span>
              </div>
            );
          })}
        </div>
        {calc.unallocated > 0 && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-accent-light px-2.5 py-2 text-xs text-accent-dark">
            <AlertIcon className="h-4 w-4 shrink-0" />
            <span>
              {formatIDR(calc.unallocated)} belum dibagi — ada lapangan/kok yang
              belum ditugaskan ke pemain.
            </span>
          </p>
        )}
      </section>

      {session.paymentQr ? (
        <div className={`${cardCls} mt-3`}>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <QrIcon className="h-5 w-5 text-primary" /> Scan untuk bayar
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {mine ? `Nominalmu: ${formatIDR(mine.total)}` : "Bayar sesuai nominal yang tertera di aplikasi pembayaranmu."}
          </p>
          <QrImage
            src={session.paymentQr}
            alt="QR pembayaran sesi"
            fileName={`QR ${session.name}`}
            className="mt-3"
          />
        </div>
      ) : (
        <div
          className={`mt-3 rounded-lg p-4 text-xs ${
            mine
              ? "bg-primary-bg text-fg-muted"
              : "bg-accent-light text-accent-dark"
          }`}
        >
          {mine
            ? "Pembuat sesi belum mengunggah QR pembayaran."
            : "Pembuat sesi belum mengunggah QR pembayaran — minta pembuat sesi mengunggahnya di tab Bayar."}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-feedback-bg px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      {meId && already ? (
        <Link href={`/sessions/${session.id}`} className={`${btnPrimary} mt-4 w-full`}>
          Kamu sudah join — buka sesi
        </Link>
      ) : (
        <button onClick={join} disabled={busy} className={`${btnPrimary} mt-4 w-full`}>
          {busy ? "Memproses…" : me ? `Join Session sebagai ${me.name}` : "Join Session"}
        </button>
      )}
      {!meId && (
        <p className="mt-3 text-center text-xs text-fg-subtle">
          Login cuma kalau mau ikut terhitung sebagai pemain.
        </p>
      )}
    </main>
  );
}
