"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { calculateSession, formatIDR } from "../../../lib/calculation";
import { formatDateID, timeRange } from "../../../lib/format";
import { api } from "../../../lib/api";
import { createClient } from "../../../lib/supabase/client";
import type { Session, User } from "../../../lib/types";
import { AlertIcon, ArrowLeftIcon, CheckIcon, ClockIcon, QrIcon, ReceiptIcon, ShuttlecockIcon } from "../../../components/icons";

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
    <main className="py-10 text-sm text-primary-dark/70">Memuat…</main>
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
    return <main className="py-10 text-sm text-primary-dark/70">Memuat…</main>;

  if (state === "missing" || !session)
    return (
      <main className="py-10 text-center">
        <p className="font-extrabold text-primary-dark">Kode {code} tidak ditemukan</p>
        <p className="mt-1 text-sm text-primary-dark/70">Minta link baru ke pembuat sesi.</p>
        <Link href="/dashboard" className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-primary-dark"><ArrowLeftIcon className="h-4 w-4" /> Dashboard</Link>
      </main>
    );

  const me = meId ? users.find((u) => u.id === meId) ?? null : null;
  const calc = calculateSession(session);
  const already = meId ? session.playerIds.includes(meId) : false;
  const userName = (pid: string) =>
    users.find((u) => u.id === pid)?.name ?? "?";
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
    <main className="py-10 md:py-16">
      <p className="flex items-center gap-2 text-sm font-extrabold text-primary-dark"><ShuttlecockIcon className="h-5 w-5" /> Undangan Sesi</p>
      <h1 className="mt-2 text-2xl font-extrabold text-primary-dark">{session.name}</h1>
      <p className="mt-1 text-sm text-primary-dark/70">
        {formatDateID(session.date)} · {timeRange(session.startTime, session.endTime)} · {session.location}
      </p>
      <div className="mt-4 rounded-lg bg-primary-bg p-4 text-sm text-primary-dark">
        <div className="flex justify-between"><span>Total biaya</span><span className="font-extrabold text-primary-dark">{formatIDR(calc.totalCost)}</span></div>
        <div className="flex justify-between"><span>Pemain</span><span className="font-semibold">{session.playerIds.length} orang</span></div>
        <p className="mt-2 font-medium">Pemain saat ini:</p>
        <p className="mt-0.5 text-primary-dark/70">{session.playerIds.map(userName).join(", ")}</p>
        <p className="mt-2 text-xs capitalize text-primary-dark/50">Status: {session.status}</p>
      </div>
      {mine && (
        <div className="mt-3 rounded-lg bg-gradient-to-b from-primary-light to-primary p-5 text-white shadow-teal-glow">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-white/80">Tagihanmu</p>
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
              {minePaid ? <CheckIcon className="h-4 w-4" /> : <ClockIcon className="h-4 w-4" />}
              {minePaid ? "Lunas" : "Belum bayar"}
            </span>
          </div>
          <p className="text-4xl font-extrabold">{formatIDR(mine.total)}</p>
          <p className="mt-1 text-sm text-white/90">
            {mine.court > 0 && `Lapangan ${formatIDR(mine.court)}`}
            {mine.shuttle > 0 && `${mine.court > 0 ? " · " : ""}Kok ${formatIDR(mine.shuttle)}`}
            {mine.additional > 0 && `${mine.court > 0 || mine.shuttle > 0 ? " · " : ""}Lain ${formatIDR(mine.additional)}`}
          </p>
        </div>
      )}
      <div className="mt-3 rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card">
        <p className="flex items-center gap-1.5 text-sm font-extrabold text-primary-dark">
          <ReceiptIcon className="h-5 w-5" /> Tagihan per Orang
        </p>
        <div className="mt-3 space-y-2">
          {session.playerIds.map((pid) => {
            const share = calc.perPlayer[pid];
            const paid = session.payments[pid] === "paid";
            return (
              <div key={pid} className="flex items-center justify-between gap-3 border-b border-primary-light/40 pb-2 last:border-0 last:pb-0">
                <span className="text-sm font-medium text-primary-dark">
                  {userName(pid)}
                  {pid === meId && <span className="text-primary-dark/50"> (kamu)</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-primary-dark">{formatIDR(share?.total ?? 0)}</span>
                  <span className={paid ? "text-success" : "text-primary-dark/30"}>
                    {paid ? <CheckIcon className="h-4 w-4" /> : <ClockIcon className="h-4 w-4" />}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        {calc.unallocated > 0 && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-accent-light/40 px-2 py-1 text-xs text-accent-dark">
            <AlertIcon className="h-4 w-4 shrink-0" /> {formatIDR(calc.unallocated)} belum dibagi — ada lapangan/kok yang belum ditugaskan ke pemain.
          </p>
        )}
      </div>
      {session.paymentQr ? (
        <div className="mt-3 rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-primary-dark">
            <QrIcon className="h-5 w-5" /> Scan untuk bayar
          </p>
          <p className="mt-1 text-xs text-primary-dark/70">
            {mine ? `Nominalmu: ${formatIDR(mine.total)}` : "Bayar sesuai nominal yang tertera di aplikasi pembayaranmu."}
          </p>
          <img src={session.paymentQr} alt="QR pembayaran sesi" className="mx-auto mt-3 w-full max-w-60 rounded-lg border border-primary-light/40" />
        </div>
      ) : (
        <div className={`mt-3 rounded-lg p-4 text-xs ${mine ? "bg-primary-bg text-primary-dark/70" : "bg-accent-light/40 text-accent-dark"}`}>
          {mine
            ? "Pembuat sesi belum mengunggah QR pembayaran."
            : "Pembuat sesi belum mengunggah QR pembayaran — minta pembuat sesi mengunggahnya di tab Bayar."}
        </div>
      )}
      {error && <p className="mt-3 rounded-lg bg-coral-light/30 px-3 py-2 text-sm text-error">{error}</p>}
      {meId && already ? (
        <Link href={`/sessions/${session.id}`} className="press mt-4 block rounded-full bg-gradient-to-b from-accent-light to-accent px-6 py-3 text-center text-sm font-extrabold text-on-accent shadow-accent-glow">
          Kamu sudah join — buka sesi
        </Link>
      ) : (
        <button onClick={join} disabled={busy} className="press mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-b from-accent-light to-accent px-6 py-3 text-sm font-extrabold text-on-accent shadow-accent-glow disabled:opacity-60">
          {busy ? "Memproses…" : me ? `Join Session sebagai ${me.name}` : "Join Session"}
        </button>
      )}
      {!meId && (
        <p className="mt-2 text-center text-xs text-primary-dark/50">
          Login cuma kalau mau ikut terhitung sebagai pemain.
        </p>
      )}
    </main>
  );
}
