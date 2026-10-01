"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { calculateSession, formatIDR } from "../../../lib/calculation";
import { ADD_COST_CATEGORIES, type Session } from "../../../lib/types";
import { currentUser } from "../../../lib/mutations";
import { useApp } from "../../../lib/useApp";
import { api } from "../../../lib/api";
import { makeId, shuttleUsedForPlayers } from "../../../lib/db";
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon, PlusIcon, XIcon } from "../../../components/icons";

const STEPS = ["Info", "Lapangan", "Pemain", "Kok", "Biaya Lain", "Review"] as const;

interface DraftCourt {
  id: string;
  name: string;
  price: number;
}
/** Draft kok: dibeli per slope, isi slope menentukan harga per butir. */
interface DraftKok {
  id: string;
  name: string;
  packPrice: number;
  packSize: number;
}
interface DraftAdd {
  id: string;
  name: string;
  category: string;
  amount: number;
}

export default function NewSessionPage() {
  const router = useRouter();
  const { data, loading, error: loadError } = useApp();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const me = data ? currentUser(data) : null;

  useEffect(() => {
    if (data && !me) router.replace("/login?next=/sessions/new");
  }, [data, me, router]);

  const [name, setName] = useState("");
  const [date, setDate] = useState("2026-10-09");

  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("21:00");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [courts, setCourts] = useState<DraftCourt[]>([]);
  const [courtName, setCourtName] = useState("");
  const [courtPrice, setCourtPrice] = useState("");

  const [players, setPlayers] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState("");

  const [shuttles, setShuttles] = useState<DraftKok[]>([]);
  const [shuttleName, setShuttleName] = useState("");
  const [shuttlePrice, setShuttlePrice] = useState("");
  const [shuttleSize, setShuttleSize] = useState("12");

  const [adds, setAdds] = useState<DraftAdd[]>([]);
  const [addName, setAddName] = useState("");
  const [addCat, setAddCat] = useState<string>(ADD_COST_CATEGORIES[0]);
  const [addAmount, setAddAmount] = useState("");

  /**
   * Pratinjau memakai alokasi yang sama dengan yang disimpan server:
   * lapangan & kok ditugaskan ke semua pemain, jadi Review sudah menunjukkan
   * tagihan per orang yang sebenarnya (bukan Rp0 karena item belum ditugaskan).
   */
  const draftSession: Session = useMemo(() => {
    const ids = players.map((_, i) => `draft-p${i}`);
    return {
      id: "draft",
      name,
      date,
      startTime,
      endTime,
      location,
      status: "upcoming",
      shareCode: "-----",
      playerIds: ids,
      courts: courts.map((c) => ({
        id: c.id,
        name: c.name,
        price: c.price,
        playerIds: ids,
      })),
      shuttlecocks: shuttles.map((k) => ({
        id: k.id,
        name: k.name,
        packPrice: k.packPrice,
        packSize: k.packSize,
        used: shuttleUsedForPlayers(ids.length),
        playerIds: ids,
      })),
      additionalCosts: adds.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        amount: a.amount,
      })),
      payments: {},
    };
  }, [name, date, startTime, endTime, location, players, courts, shuttles, adds]);
  const calc = useMemo(() => calculateSession(draftSession), [draftSession]);

  /**
   * Komit ketikan yang masih tertahan di kolom input sebelum pindah langkah.
   * Tanpa ini, harga yang sudah diketik tapi belum ditekan "+" hilang
   * diam-diam dan Review menampilkan Rp0. Ketikan yang belum lengkap menahan
   * di langkah ini dengan pesan — tidak dibuang tanpa jejak.
   * Kembalikan pesan error, atau "" bila boleh lanjut.
   */
  const commitPending = (): string => {
    if (step === 1) {
      if (courtPrice.trim().length > 0) {
        if (Number.isNaN(Number(courtPrice))) return "Harga lapangan harus berupa angka";
        addCourt();
        return "";
      }
      if (courtName.trim().length > 0) return "Isi harga lapangan dulu, atau kosongkan kolom nama";
    }
    if (step === 2) {
      addPlayer();
      return "";
    }
    if (step === 3) {
      if (shuttlePrice.trim().length > 0 || shuttleName.trim().length > 0) {
        if (shuttlePrice.trim().length === 0 || Number.isNaN(Number(shuttlePrice))) {
          return "Isi harga 1 slope kok dulu, atau kosongkan kolomnya";
        }
        const size = Number(shuttleSize);
        if (shuttleSize.trim().length === 0 || Number.isNaN(size) || size < 1) {
          return "Isi 1 slope minimal 1 butir";
        }
        addShuttle();
      }
      return "";
    }
    if (step === 4) {
      const hasName = addName.trim().length > 0;
      const hasAmount = addAmount.trim().length > 0;
      if (hasName || hasAmount) {
        if (!hasName || !hasAmount) return "Lengkapi nama dan nominal biaya";
        if (Number.isNaN(Number(addAmount))) return "Nominal biaya harus berupa angka";
        addCost();
      }
    }
    return "";
  };

   const next = () => {
     setError("");
     if (step === 0 && name.trim().length === 0) {
       setError("Kasih nama sesi dulu ya");
       return;
     }
    const blocked = commitPending();
    if (blocked) {
      setError(blocked);
      return;
    }
     setStep((s) => Math.min(s + 1, STEPS.length - 1));
   };

  const addCourt = () => {
    if (courtPrice.trim().length === 0 || Number.isNaN(Number(courtPrice))) {
      setError("Masukkan harga lapangan terlebih dahulu");
      return;
    }
    setError("");
    setCourts((c) => [
      ...c,
      { id: makeId(), name: courtName.trim() || `Lapangan ${c.length + 1}`, price: Number(courtPrice) },
    ]);
    setCourtName("");
    setCourtPrice("");
  };

  const addPlayer = () => {
    if (!playerName.trim()) return;
    setPlayers((p) => [...p, playerName.trim()]);
    setPlayerName("");
  };

  const addCost = () => {
    if (
      addName.trim().length === 0 ||
      addAmount.trim().length === 0 ||
      Number.isNaN(Number(addAmount))
    ) {
      setError("Lengkapi nama dan nominal biaya");
      return;
    }
    setError("");
    setAdds((a) => [
      ...a,
      { id: makeId(), name: addName.trim(), category: addCat, amount: Number(addAmount) },
    ]);
    setAddName("");
    setAddAmount("");
  };

  const addShuttle = () => {
    const price = Number(shuttlePrice);
    const size = Number(shuttleSize);
    if (shuttlePrice.trim().length === 0 || Number.isNaN(price)) {
      setError("Masukkan harga 1 slope kok terlebih dahulu");
      return;
    }
    if (shuttleSize.trim().length === 0 || Number.isNaN(size) || size < 1) {
      setError("Isi 1 slope minimal 1 butir");
      return;
    }
    setError("");
    setShuttles((k) => [
      ...k,
      {
        id: makeId(),
        name: shuttleName.trim() || `Kok #${k.length + 1}`,
        packPrice: Math.round(price),
        packSize: Math.round(size),
      },
    ]);
    setShuttleName("");
    setShuttlePrice("");
    setShuttleSize("12");
  };

  const create = async () => {
    if (name.trim().length === 0) {
      setError("Kasih nama sesi dulu ya");
      setStep(0);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.createSession({
        name: name.trim(),
        date,
        startTime,
        endTime,
        location: location.trim(),
        notes: notes.trim() || undefined,
        playerNames: players.map((p) => p.trim()).filter((p) => p.length > 0),
        courts: courts.map((c) => ({ name: c.name, price: c.price })),
        shuttlecocks: shuttles.map((k) => ({ name: k.name, packPrice: k.packPrice, packSize: k.packSize })),
        additionalCosts: adds.map((a) => ({
          name: a.name,
          category: a.category,
          amount: a.amount,
        })),
      });
      router.push(`/sessions/${res.session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat sesi");
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border-2 border-primary-light bg-cream px-4 py-2.5 text-sm text-primary-dark outline-none placeholder:text-primary-dark/50 focus:border-primary focus:shadow-focus";
  const btnPrimary =
    "press inline-flex items-center justify-center rounded-full bg-gradient-to-b from-accent-light to-accent px-6 py-3 text-sm font-extrabold text-on-accent shadow-accent-glow";
  const btnSecondary =
    "press inline-flex items-center justify-center rounded-full border-2 border-primary px-6 py-3 text-sm font-extrabold text-primary-dark hover:bg-primary-bg";
  const addBtn =
    "press inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-accent-light to-accent px-4 font-extrabold text-on-accent shadow-accent-glow";
  const itemCard =
    "animate-row-in flex items-center justify-between rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card text-sm";
  const labelCls = "text-sm font-extrabold text-primary-dark";

  if (loadError) {
    return <main className="py-10 text-sm text-coral">Gagal memuat data: {loadError}</main>;
  }

  if (loading || !data || !me) {
    return <main className="py-10 text-sm text-primary-dark/70">Memuat…</main>;
  }

  return (
    <main className="py-6 md:py-10">
      <h1 className="text-2xl font-extrabold text-primary-dark">Buat Sesi Baru</h1>
      <div className="mt-3 flex gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i < step && setStep(i)}
            className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-primary-bg"}`}
            aria-label={s}
          />
        ))}
      </div>
      <p className="mt-2 text-sm font-medium text-primary-dark/70">
        Langkah {step + 1} dari {STEPS.length}: {STEPS[step]}
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-coral-light/30 px-3 py-2 text-sm text-error">{error}</p>
      )}

      <div className="mt-4">
        {step === 0 && (
          <div className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="w-name">Nama sesi *</label>
              <input id="w-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Badminton Jumat Malam" className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className={labelCls} htmlFor="w-date">Tanggal</label>
              <input id="w-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} mt-1`} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls} htmlFor="w-start">Mulai</label>
                <input id="w-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`${inputCls} mt-1`} />
              </div>
              <div className="flex-1">
                <label className={labelCls} htmlFor="w-end">Selesai</label>
                <input id="w-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`${inputCls} mt-1`} />
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="w-loc">Lokasi</label>
              <input id="w-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="cth. GOR X" className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className={labelCls} htmlFor="w-notes">Catatan (opsional)</label>
              <textarea id="w-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputCls} mt-1`} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="flex gap-2">
              <input value={courtName} onChange={(e) => setCourtName(e.target.value)} placeholder="Nama lapangan" className={inputCls} />
              <input value={courtPrice} onChange={(e) => setCourtPrice(e.target.value)} placeholder="Harga" inputMode="numeric" className={`${inputCls} w-32`} />
              <button onClick={addCourt} className={addBtn} aria-label="Tambah lapangan"><PlusIcon className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 space-y-2">
              {courts.map((c) => (
                <div key={c.id} className={itemCard}>
                  <span className="font-medium">{c.name}</span>
                  <span className="flex items-center gap-2 text-primary-dark">
                    {formatIDR(c.price)}
                    <button onClick={() => setCourts((cs) => cs.filter((x) => x.id !== c.id))} className="text-coral" aria-label="Hapus lapangan"><XIcon className="h-4 w-4" /></button>
                  </span>
                </div>
              ))}
              {courts.length === 0 && <p className="text-sm text-primary-dark/60">Belum ada lapangan.</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex gap-2">
              <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Nama pemain" className={inputCls} onKeyDown={(e) => { if (e.key === "Enter") addPlayer(); }} />
              <button onClick={addPlayer} className={addBtn} aria-label="Tambah pemain"><PlusIcon className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 text-xs text-primary-dark/60">Pemain pertama = kamu ({data ? currentUser(data)?.name : ""}).</p>
            <div className="mt-3 space-y-2">
              {players.map((p, i) => (
                <div key={i} className={itemCard}>
                  <span className="font-medium">{p}{i === 0 ? " (kamu)" : ""}</span>
                  <button onClick={() => setPlayers((ps) => ps.filter((_, x) => x !== i))} className="text-coral" aria-label="Hapus pemain"><XIcon className="h-4 w-4" /></button>
                </div>
              ))}
              {players.length === 0 && <p className="text-sm text-primary-dark/60">Belum ada pemain.</p>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="flex gap-2">
              <input value={shuttleName} onChange={(e) => setShuttleName(e.target.value)} placeholder="Nama kok" className={inputCls} />
              <input value={shuttlePrice} onChange={(e) => setShuttlePrice(e.target.value)} placeholder="Harga 1 slope" inputMode="numeric" className={`${inputCls} w-36`} />
              <input value={shuttleSize} onChange={(e) => setShuttleSize(e.target.value)} placeholder="Isi" inputMode="numeric" className={`${inputCls} w-20`} aria-label="Isi satu slope" />
              <button onClick={addShuttle} className={addBtn} aria-label="Tambah kok"><PlusIcon className="h-4 w-4" /></button>
            </div>
            <p className="mt-1.5 text-xs text-primary-dark/60">Masukkan harga <b>1 slope/tube utuh</b>, bukan harga per butir. Harga per butir dihitung otomatis.</p>
            <div className="mt-3 space-y-2">
              {shuttles.map((k) => (
                <div key={k.id} className={itemCard}>
                  <span className="font-medium">
                    {k.name}
                    <span className="ml-1.5 text-xs font-normal text-primary-dark/70">
                      {formatIDR(k.packPrice)}/slope · isi {k.packSize} butir → {formatIDR(Math.round(k.packPrice / k.packSize))}/butir
                    </span>
                  </span>
                  <button onClick={() => setShuttles((ks) => ks.filter((x) => x.id !== k.id))} className="text-coral" aria-label="Hapus kok"><XIcon className="h-4 w-4" /></button>
                </div>
              ))}
              {shuttles.length === 0 && <p className="text-sm text-primary-dark/60">Belum ada kok.</p>}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="space-y-2 rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card">
              <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Nama biaya" className={inputCls} />
              <div className="flex gap-2">
                <select value={addCat} onChange={(e) => setAddCat(e.target.value)} className={`${inputCls} flex-1`}>
                  {ADD_COST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="Nominal" inputMode="numeric" className={`${inputCls} w-32`} />
              </div>
              <button onClick={addCost} className={`${btnPrimary} gap-1.5`}><PlusIcon className="h-4 w-4" /> Tambah biaya</button>
            </div>
            <div className="mt-3 space-y-2">
              {adds.map((a) => (
                <div key={a.id} className={itemCard}>
                  <span className="font-medium">{a.name} <span className="font-normal text-primary-dark/70">· {a.category}</span></span>
                  <span className="flex items-center gap-2 text-primary-dark">
                    {formatIDR(a.amount)}
                    <button onClick={() => setAdds((xs) => xs.filter((x) => x.id !== a.id))} className="text-coral" aria-label="Hapus biaya"><XIcon className="h-4 w-4" /></button>
                  </span>
                </div>
              ))}
              {adds.length === 0 && <p className="text-sm text-primary-dark/60">Belum ada biaya tambahan.</p>}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <div className="rounded-lg bg-primary-bg p-4">
              <p className="font-extrabold text-primary-dark">{name || "(tanpa nama)"}</p>
              <p className="text-xs text-primary-dark/70">{date} · {startTime}–{endTime} · {location || "-"}</p>
              <div className="mt-3 space-y-1 text-sm text-primary-dark">
                <div className="flex justify-between"><span>Total biaya</span><span className="font-extrabold text-primary-dark">{formatIDR(calc.totalCost)}</span></div>
                <div className="flex justify-between"><span>{players.length} pemain</span><span className="font-semibold">{players.length > 0 ? formatIDR(Math.round(calc.totalCost / players.length)) + " rata-rata/orang" : "-"}</span></div>
                {calc.unallocated > 0 && <p className="flex items-center gap-1.5 rounded-lg bg-accent-light/40 px-2 py-1 text-xs text-accent-dark"><AlertIcon className="h-4 w-4 shrink-0" /> {formatIDR(calc.unallocated)} belum terbagi — tambahkan pemain dulu agar bisa dihitung per orang.</p>}
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {players.map((p, i) => (
                <div key={i} className="flex justify-between rounded-lg border border-primary-light/40 bg-surface-card px-3 py-2 text-sm text-primary-dark">
                  <span>{p}</span>
                  <span className="font-semibold">{formatIDR(calc.perPlayer[`draft-p${i}`]?.total ?? 0)}</span>
                </div>
              ))}
              {players.length === 0 && <p className="text-sm text-primary-dark/60">Tambahkan minimal satu pemain untuk menghitung tagihan.</p>}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button onClick={() => { setError(""); setStep((s) => s - 1); }} className={`${btnSecondary} flex-1 gap-1.5`}>
            <ArrowLeftIcon className="h-4 w-4" /> Kembali
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={next} className={`${btnPrimary} flex-1 gap-1.5`}>Lanjut <ArrowRightIcon className="h-4 w-4" /></button>
        ) : (
          <button onClick={create} disabled={busy} className={`${btnPrimary} flex-1 disabled:opacity-60`}>{busy ? "Menyimpan…" : "Buat Sesi"}</button>
        )}
      </div>
    </main>
  );
}
