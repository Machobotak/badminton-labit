"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { calculateSession, formatIDR, shuttleItemCost, shuttleUnitPrice } from "../../../lib/calculation";
import { formatDateID, timeRange } from "../../../lib/format";
import { ADD_COST_CATEGORIES, type Session } from "../../../lib/types";
import { currentUser, removePlayer, togglePaid } from "../../../lib/mutations";
import { makeId } from "../../../lib/db";
import { useApp } from "../../../lib/useApp";
import { AlertIcon, ArrowLeftIcon, CheckIcon, ClockIcon, LinkIcon, PlusIcon, QrIcon, UploadIcon, XIcon } from "../../../components/icons";

const TABS = [
  "overview",
  "players",
  "courts",
  "shuttlecocks",
  "additional",
  "payments",
] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: "Ringkasan",
  players: "Pemain",
  courts: "Lapangan",
  shuttlecocks: "Kok",
  additional: "Biaya Lain",
  payments: "Bayar",
};

/** Rasio baku pemakaian kok: 4 pemain menghabiskan 2 butir → 0,5 butir/orang. */
const PCS_PER_FOUR_PLAYERS = 2;

function DetailBody({ id }: { id: string }) {
  const router = useRouter();
  const tab = (useSearchParams().get("tab") as Tab) || "overview";
  const active: Tab = TABS.includes(tab) ? tab : "overview";
  const {
    data,
    loading,
    error: loadError,
    update,
    addPlayer: addPlayerApi,
    removeSession,
  } = useApp();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newPlayer, setNewPlayer] = useState("");
  const [newCourtName, setNewCourtName] = useState("");
  const [newCourtPrice, setNewCourtPrice] = useState("");
  const [newKokName, setNewKokName] = useState("");
  const [newKokPackPrice, setNewKokPackPrice] = useState("");
  const [newKokPackSize, setNewKokPackSize] = useState("12");
  const [editingKok, setEditingKok] = useState<string | null>(null);
  const [kokPriceDraft, setKokPriceDraft] = useState("");
  const [kokSizeDraft, setKokSizeDraft] = useState("");
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [newAddName, setNewAddName] = useState("");
  const [newAddCat, setNewAddCat] = useState<string>(ADD_COST_CATEGORIES[0]);
  const [newAddAmount, setNewAddAmount] = useState("");
  const [editingAdd, setEditingAdd] = useState<string | null>(null);
  const [addNameDraft, setAddNameDraft] = useState("");
  const [addCatDraft, setAddCatDraft] = useState<string>(ADD_COST_CATEGORIES[0]);
  const [addAmountDraft, setAddAmountDraft] = useState("");
  const [addError, setAddError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [qrError, setQrError] = useState("");
  const qrInputRef = useRef<HTMLInputElement>(null);
  const session: Session | null =
    data?.sessions.find((s) => s.id === id) ?? null;
  const me = data ? currentUser(data) : null;
  const calc = useMemo(
    () => (session ? calculateSession(session) : null),
    [session],
  );

  useEffect(() => {
    if (data && !me) router.replace(`/login?next=/sessions/${id}`);
  }, [data, me, id, router]);

  if (loadError)
    return <main className="py-10 text-sm text-coral">Gagal memuat data: {loadError}</main>;
  if (loading || !data || !me)
    return <main className="py-10 text-sm text-primary-dark/70">Memuat…</main>;
  if (!session)
    return (
      <main className="py-10 text-center">
        <p className="font-extrabold text-primary-dark">Sesi tidak ditemukan</p>
        <Link href="/dashboard" className="mt-2 inline-flex items-center gap-1.5 text-sm font-extrabold text-primary-dark hover:underline"><ArrowLeftIcon className="h-4 w-4" /> Kembali ke dashboard</Link>
      </main>
    );

  const userName = (pid: string) =>
    data.users.find((u) => u.id === pid)?.name ?? "?";
  const go = (t: Tab) => router.push(`/sessions/${id}?tab=${t}`);
  const paidCount = session.playerIds.filter((p) => session.payments[p] === "paid").length;
  const collected = session.playerIds
    .filter((p) => session.payments[p] === "paid")
    .reduce((sum, p) => sum + (calc?.perPlayer[p]?.total ?? 0), 0);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${session.shareCode}`
      : `/s/${session.shareCode}`;
  const mine = calc?.perPlayer[me.id];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* clipboard unavailable — tetap tampilkan feedback */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addPlayer = () => {
    const v = newPlayer.trim();
    if (!v) return;
    setNewPlayer("");
    void addPlayerApi(id, v);
  };

  const MAX_QR_BYTES = 700 * 1024;

  const handleQrFile = (file: File | undefined) => {
    setQrError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setQrError("File harus berupa gambar (PNG/JPG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setQrError("Ukuran gambar maksimal 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxSide = 640;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        let dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        if (dataUrl.length > MAX_QR_BYTES) {
          dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        }
        if (dataUrl.length > MAX_QR_BYTES) {
          setQrError("Gambar terlalu besar untuk disimpan — coba gambar yang lebih kecil.");
          return;
        }
        update((d) => {
          const s = d.sessions.find((x) => x.id === id);
          if (s) s.paymentQr = dataUrl;
        });
      };
      img.onerror = () => setQrError("Gambar tidak bisa dibaca — coba file lain.");
      img.src = url;
    };
    reader.onerror = () => setQrError("Gagal membaca file — coba lagi.");
    reader.readAsDataURL(file);
  };

  const removeQr = () => {
    setQrError("");
    update((d) => {
      const s = d.sessions.find((x) => x.id === id);
      if (s) s.paymentQr = undefined;
    });
    if (qrInputRef.current) qrInputRef.current.value = "";
  };

  const toggleAssign = (
    kind: "courts" | "shuttlecocks",
    itemId: string,
    pid: string,
  ) => {
    update((d) => {
      const s = d.sessions.find((x) => x.id === id);
      const item = s?.[kind].find((x) => x.id === itemId);
      if (!item) return;
      const on = item.playerIds.includes(pid);
      item.playerIds = on
        ? item.playerIds.filter((x) => x !== pid)
        : [...item.playerIds, pid];
      // Kok: begitu pemain ditambah, butir terpakai dinaikkan ke rasio baku
      // "4 pemain menghabiskan 2 butir" → used = round(2n/4) (4 pemain → 2).
      // Tidak pernah diturunkan saat pemain dilepas: pemakaian itu fakta, bukan turunan.
      if (!on && kind === "shuttlecocks" && "used" in item) {
        item.used = Math.max(
          item.used,
          Math.round((PCS_PER_FOUR_PLAYERS * item.playerIds.length) / 4),
        );
      }
    });
  };

  const bumpKokUsed = (itemId: string, delta: number) => {
    update((d) => {
      const it = d.sessions
        .find((x) => x.id === id)
        ?.shuttlecocks.find((x) => x.id === itemId);
      if (it) it.used = Math.max(0, it.used + delta);
    });
  };

  // Biaya tambahan dibagi rata ke SEMUA pemain sesi (lihat calculateSession),
  // jadi keanggotaannya tidak diatur per item seperti lapangan/kok.
  const addAdditional = () => {
    const name = newAddName.trim();
    const amount = Number(newAddAmount);
    if (!name) {
      setAddError("Nama biaya tidak boleh kosong.");
      return;
    }
    if (newAddAmount.trim().length === 0 || Number.isNaN(amount) || amount < 0) {
      setAddError("Nominal harus angka ≥ 0.");
      return;
    }
    setAddError("");
    update((d) => {
      d.sessions
        .find((x) => x.id === id)
        ?.additionalCosts.push({
          id: makeId(),
          name,
          category: newAddCat,
          amount: Math.round(amount),
        });
    });
    setNewAddName("");
    setNewAddAmount("");
    setNewAddCat(ADD_COST_CATEGORIES[0]);
  };

  const saveAdditional = (addId: string) => {
    const name = addNameDraft.trim();
    const amount = Number(addAmountDraft);
    if (!name) {
      setAddError("Nama biaya tidak boleh kosong.");
      return;
    }
    if (addAmountDraft.trim().length === 0 || Number.isNaN(amount) || amount < 0) {
      setAddError("Nominal harus angka ≥ 0.");
      return;
    }
    setAddError("");
    update((d) => {
      const it = d.sessions
        .find((x) => x.id === id)
        ?.additionalCosts.find((x) => x.id === addId);
      if (it) {
        it.name = name;
        it.category = addCatDraft;
        it.amount = Math.round(amount);
      }
    });
    setEditingAdd(null);
  };

  const removeAdditional = (addId: string) => {
    setAddError("");
    setEditingAdd(null);
    update((d) => {
      const s = d.sessions.find((x) => x.id === id);
      if (s) s.additionalCosts = s.additionalCosts.filter((x) => x.id !== addId);
    });
  };

  const hapusSesi = async () => {
    if (
      !window.confirm(
        `Hapus sesi "${session.name}"? Semua lapangan, kok, dan biaya di dalamnya ikut terhapus. Tindakan ini tidak bisa dibatalkan.`,
      )
    )
      return;
    setDeleteError("");
    try {
      await removeSession(id);
      router.replace("/dashboard");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Gagal menghapus sesi");
    }
  };

  const inputCls =
    "rounded-lg border-2 border-primary-light bg-cream px-4 py-2 text-sm text-primary-dark outline-none placeholder:text-primary-dark/50 focus:border-primary focus:shadow-focus";
  const addBtn =
    "press inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-accent-light to-accent px-4 text-sm font-extrabold text-on-accent shadow-accent-glow";
  const statusTag =
    session.status === "completed"
      ? "bg-primary-bg text-primary-dark"
      : session.status === "active"
        ? "bg-primary-light text-primary-dark"
        : "bg-accent-light text-accent-dark";

  const assignList = (
    kind: "courts" | "shuttlecocks",
    item: { id: string; playerIds: string[]; paidBy?: string },
  ) => (
    <div className="mt-2 border-t border-primary-light/40 pt-2">
      <p className="text-xs font-medium text-primary-dark/70">Siapa main di sini?</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {session.playerIds.map((pid) => {
          const on = item.playerIds.includes(pid);
          return (
            <button
              key={pid}
              onClick={() => toggleAssign(kind, item.id, pid)}
              className={`press rounded-full px-3 py-1 text-xs font-bold ${
                on ? "bg-primary text-white shadow-teal-glow" : "bg-primary-bg text-primary-dark"
              }`}
            >
              {userName(pid)}
            </button>
          );
        })}
      </div>
      {item.playerIds.length === 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-coral"><AlertIcon className="h-3.5 w-3.5" /> Belum ada pemain di item ini</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <label className="text-xs text-primary-dark/70" htmlFor={`paidby-${kind}-${item.id}`}>Siapa yang nombok?</label>
        <select
          id={`paidby-${kind}-${item.id}`}
          value={item.paidBy ?? ""}
          onChange={(e) =>
            update((d) => {
              const it = d.sessions
                .find((x) => x.id === id)?.[kind]
                .find((x) => x.id === item.id);
              if (it) it.paidBy = e.target.value || undefined;
            })
          }
          className="rounded-lg border border-primary-light bg-cream px-2 py-1 text-xs text-primary-dark"
        >
          <option value="">—</option>
          {session.playerIds.map((pid) => (
            <option key={pid} value={pid}>
              {userName(pid)}
            </option>
          ))}
        </select>
        {item.paidBy && (
          <span className="text-xs font-bold text-primary-dark">
            Ditalangi {userName(item.paidBy)}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <main className="py-6 md:py-10">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark/70 hover:text-primary-dark hover:underline">
        <ArrowLeftIcon className="h-4 w-4" /> Dashboard
      </Link>
      <div className="mt-1 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-dark">{session.name}</h1>
          <p className="mt-0.5 text-xs text-primary-dark/70">
            {formatDateID(session.date)} · {timeRange(session.startTime, session.endTime)} · {session.location}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusTag}`}>
          {session.status}
        </span>
      </div>

      {session.creatorId === me.id && (
        <div className="mt-3">
          <button
            onClick={() => void hapusSesi()}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-coral px-4 py-2 text-sm font-extrabold text-coral"
          >
            <XIcon className="h-4 w-4" /> Hapus Sesi
          </button>
          {deleteError && (
            <p className="mt-2 rounded-lg bg-coral-light/30 px-3 py-2 text-sm text-error">
              {deleteError}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => go(t)}
            className={`press whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors duration-150 ${
              active === t ? "bg-primary text-white shadow-teal-glow" : "bg-primary-bg text-primary-dark hover:bg-primary-light/60"
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {active === "overview" && calc && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-gradient-to-b from-primary-light to-primary p-5 text-white shadow-teal-glow">
            <p className="text-xs text-white/80">Tagihanmu</p>
            <p className="text-4xl font-extrabold">
              {mine ? formatIDR(mine.total) : formatIDR(0)}
            </p>
            <div className="mt-2 flex gap-3 text-xs text-white/90">
              <span>Total {formatIDR(calc.totalCost)}</span>
              <span>·</span>
              <span>{session.playerIds.length} pemain</span>
              <span>·</span>
              <span>{paidCount}/{session.playerIds.length} lunas</span>
            </div>
            <div className="mt-1 text-xs text-white/90">
              Terkumpul {formatIDR(collected)} · Sisa {formatIDR(calc.allocatedTotal - collected)}
            </div>
          </div>

          <button
            onClick={copyLink}
            className="press inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-primary px-6 py-3 text-sm font-extrabold text-primary-dark hover:bg-primary-bg w-full"
          >
            {copied ? <><CheckIcon className="h-4 w-4" /> Link Copied</> : <><LinkIcon className="h-4 w-4" /> Share Session</>}
          </button>
          <p className="truncate text-center text-xs text-primary-dark/50">{shareUrl}</p>

          {session.playerIds.length === 0 ? (
            <p className="rounded-lg bg-primary-bg p-4 text-center text-sm text-primary-dark/60">
              Tambahkan minimal satu pemain untuk menghitung tagihan.
            </p>
          ) : (
            <div className="space-y-2">
              {session.playerIds.map((pid) => {
                const p = calc.perPlayer[pid];
                const open = expanded === pid;
                return (
                  <div key={pid} className="rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card">
                    <button
                      onClick={() => setExpanded(open ? null : pid)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-primary-bg/60"
                    >
                      <span className="inline-flex items-center gap-1.5 font-extrabold text-primary-dark">
                        {userName(pid)}
                        {pid === me.id ? " (kamu)" : ""}{" "}
                        {session.payments[pid] === "paid" ? <CheckIcon className="h-4 w-4 text-success" /> : <ClockIcon className="h-4 w-4 text-primary-dark/30" />}
                      </span>
                      <span className="font-extrabold text-primary-dark">{formatIDR(p?.total ?? 0)}</span>
                    </button>
                    {open && p && (
                      <div className="space-y-0.5 border-t border-primary-light/40 px-3 py-2 text-xs text-primary-dark/70">
                        <div className="flex justify-between"><span>Lapangan</span><span>{formatIDR(p.court)}</span></div>
                        <div className="flex justify-between"><span>Kok</span><span>{formatIDR(p.shuttle)}</span></div>
                        <div className="flex justify-between"><span>Biaya lain</span><span>{formatIDR(p.additional)}</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {calc.unallocated > 0 && (
            <p className="flex items-center gap-1.5 rounded-lg bg-accent-light/40 px-3 py-2 text-xs text-accent-dark">
              <AlertIcon className="h-4 w-4 shrink-0" /> {formatIDR(calc.unallocated)} belum terbagi — ada court/kok tanpa pemain.
            </p>
          )}
        </div>
      )}

      {active === "players" && (
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              placeholder="Nama pemain baru"
              className={`${inputCls} w-full`}
            />
            <button onClick={addPlayer} className={addBtn} aria-label="Tambah pemain"><PlusIcon className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 space-y-2">
            {session.playerIds.map((pid) => (
              <div key={pid} className="animate-row-in flex items-center justify-between rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card text-sm">
                <span className="font-medium text-primary-dark">
                  {userName(pid)}{" "}
                  <span className="text-primary-dark/60">
                    {formatIDR(calc?.perPlayer[pid]?.total ?? 0)}
                  </span>
                </span>
                <button
                  onClick={() => update((d) => removePlayer(d, id, pid))}
                  className="text-sm text-coral transition-colors duration-150 hover:underline"
                >
                  Hapus
                </button>
              </div>
            ))}
            {session.playerIds.length === 0 && (
              <p className="text-sm text-primary-dark/60">Tambahkan minimal satu pemain untuk menghitung tagihan.</p>
            )}
          </div>
        </div>
      )}

      {active === "courts" && (
        <div className="mt-4">
          <div className="flex gap-2">
            <input value={newCourtName} onChange={(e) => setNewCourtName(e.target.value)} placeholder="Nama lapangan" className={`${inputCls} w-full`} />
            <input value={newCourtPrice} onChange={(e) => setNewCourtPrice(e.target.value)} placeholder="Harga" inputMode="numeric" className={`${inputCls} w-28`} />
            <button
              onClick={() => {
                if (!newCourtPrice.trim() || Number.isNaN(Number(newCourtPrice))) return;
                update((d) => {
                  d.sessions.find((x) => x.id === id)?.courts.push({
                    id: makeId(),
                    name: newCourtName.trim() || "Lapangan baru",
                    price: Number(newCourtPrice),
                    playerIds: [],
                  });
                });
                setNewCourtName("");
                setNewCourtPrice("");
              }}
              className={addBtn}
              aria-label="Tambah lapangan"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {session.courts.map((c) => (
              <div key={c.id} className="rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-primary-dark">{c.name}</span>
                  {editingPrice === c.id ? (
                    <span className="flex items-center gap-1.5">
                      <input
                        value={priceDraft}
                        onChange={(e) => setPriceDraft(e.target.value)}
                        inputMode="numeric"
                        className="w-24 rounded-lg border border-primary-light bg-cream px-2 py-1 text-sm text-primary-dark"
                      />
                      <button
                        onClick={() => {
                          const v = Number(priceDraft);
                          if (!Number.isNaN(v)) {
                            update((d) => {
                              const it = d.sessions.find((x) => x.id === id)?.courts.find((x) => x.id === c.id);
                              if (it) it.price = v;
                            });
                          }
                          setEditingPrice(null);
                        }}
                        className="text-sm font-extrabold text-primary-dark transition-colors duration-150 hover:text-primary-light"
                        aria-label="Simpan harga"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-primary-dark/70">
                      {formatIDR(c.price)}
                      <button
                        onClick={() => { setEditingPrice(c.id); setPriceDraft(String(c.price)); }}
                        className="text-xs text-primary-dark/60 transition-colors duration-150 hover:text-primary-dark hover:underline"
                      >
                        Ubah
                      </button>
                      <button
                        onClick={() => update((d) => {
                          const s = d.sessions.find((x) => x.id === id);
                          if (s) s.courts = s.courts.filter((x) => x.id !== c.id);
                        })}
                        className="text-coral transition-colors duration-150 hover:underline"
                        aria-label="Hapus lapangan"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </div>
                {assignList("courts", c)}
              </div>
            ))}
          </div>
        </div>
      )}

      {active === "shuttlecocks" && (
        <div className="mt-4">
          <div className="flex gap-2">
            <input value={newKokName} onChange={(e) => setNewKokName(e.target.value)} placeholder="Nama kok" className={`${inputCls} w-full`} />
            <input value={newKokPackPrice} onChange={(e) => setNewKokPackPrice(e.target.value)} placeholder="Harga 1 slope" inputMode="numeric" className={`${inputCls} w-36`} />
            <input value={newKokPackSize} onChange={(e) => setNewKokPackSize(e.target.value)} placeholder="Isi" inputMode="numeric" className={`${inputCls} w-20`} aria-label="Isi satu slope" />
            <button
              onClick={() => {
                const price = Number(newKokPackPrice);
                const size = Number(newKokPackSize);
                if (newKokPackPrice.trim().length === 0 || Number.isNaN(price)) return;
                if (newKokPackSize.trim().length === 0 || Number.isNaN(size) || size < 1) return;
                update((d) => {
                  d.sessions.find((x) => x.id === id)?.shuttlecocks.push({
                    id: makeId(),
                    name: newKokName.trim() || "Kok baru",
                    packPrice: Math.round(price),
                    packSize: Math.round(size),
                    used: 0,
                    playerIds: [],
                  });
                });
                setNewKokName("");
                setNewKokPackPrice("");
                setNewKokPackSize("12");
              }}
              className={addBtn}
              aria-label="Tambah kok"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs text-primary-dark/60">Masukkan harga <b>1 slope/tube utuh</b>. Harga per butir dihitung otomatis.</p>
          <div className="mt-3 space-y-2">
            {session.shuttlecocks.map((k) => {
              const cost = shuttleItemCost(k);
              const perHead = k.playerIds.length > 0 ? Math.round(cost / k.playerIds.length) : 0;
              return (
                <div key={k.id} className="rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-primary-dark">{k.name}</span>
                    {editingKok === k.id ? (
                      <span className="flex items-center gap-1.5">
                        <input
                          value={kokPriceDraft}
                          onChange={(e) => setKokPriceDraft(e.target.value)}
                          inputMode="numeric"
                          aria-label="Harga 1 slope"
                          className="w-24 rounded-lg border border-primary-light bg-cream px-2 py-1 text-sm text-primary-dark"
                        />
                        <span className="text-xs text-primary-dark/70">slope × isi</span>
                        <input
                          value={kokSizeDraft}
                          onChange={(e) => setKokSizeDraft(e.target.value)}
                          inputMode="numeric"
                          aria-label="Isi satu slope"
                          className="w-14 rounded-lg border border-primary-light bg-cream px-2 py-1 text-sm text-primary-dark"
                        />
                        <button
                          onClick={() => {
                            const p = Number(kokPriceDraft);
                            const n = Number(kokSizeDraft);
                            if (!Number.isNaN(p) && !Number.isNaN(n) && n >= 1) {
                              update((d) => {
                                const it = d.sessions.find((x) => x.id === id)?.shuttlecocks.find((x) => x.id === k.id);
                                if (it) {
                                  it.packPrice = Math.round(p);
                                  it.packSize = Math.round(n);
                                }
                              });
                            }
                            setEditingKok(null);
                          }}
                          className="text-sm font-extrabold text-primary-dark transition-colors duration-150 hover:text-primary-light"
                          aria-label="Simpan harga kok"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-primary-dark/70">
                        {formatIDR(k.packPrice)}/slope isi {k.packSize} = {formatIDR(Math.round(shuttleUnitPrice(k)))}/butir
                        <button
                          onClick={() => { setEditingKok(k.id); setKokPriceDraft(String(k.packPrice)); setKokSizeDraft(String(k.packSize)); }}
                          className="text-xs text-primary-dark/60 transition-colors duration-150 hover:text-primary-dark hover:underline"
                        >
                          Ubah
                        </button>
                        <button
                          onClick={() => update((d) => {
                            const s = d.sessions.find((x) => x.id === id);
                            if (s) s.shuttlecocks = s.shuttlecocks.filter((x) => x.id !== k.id);
                          })}
                          className="text-coral transition-colors duration-150 hover:underline"
                          aria-label="Hapus kok"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary-bg px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-primary-dark">
                      <span className="text-xs font-medium text-primary-dark/70">Terpakai</span>
                      <button
                        onClick={() => bumpKokUsed(k.id, -1)}
                        className="press h-6 w-6 rounded-full bg-surface-card font-extrabold text-primary-dark transition-colors duration-150 hover:bg-primary-bg"
                        aria-label="Kurangi butir terpakai"
                      >
                        −
                      </button>
                      <span className="min-w-14 text-center font-extrabold">{k.used} butir</span>
                      <button
                        onClick={() => bumpKokUsed(k.id, 1)}
                        className="press h-6 w-6 rounded-full bg-surface-card font-extrabold text-primary-dark transition-colors duration-150 hover:bg-primary-bg"
                        aria-label="Tambah butir terpakai"
                      >
                        +
                      </button>
                    </span>
                    <span className="text-primary-dark/70">
                      = <b className="text-primary-dark">{formatIDR(cost)}</b>
                      {k.playerIds.length > 0 && <> · ≈{formatIDR(perHead)}/orang ({k.playerIds.length} pemain)</>}
                    </span>
                  </div>
                  {assignList("shuttlecocks", k)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {active === "additional" && calc && (
        <div className="mt-4">
          <div className="space-y-2 rounded-lg bg-surface-card p-4 shadow-card">
            <input
              value={newAddName}
              onChange={(e) => setNewAddName(e.target.value)}
              placeholder="Nama biaya (mis. Booking Admin)"
              className={`${inputCls} w-full`}
            />
            <div className="flex gap-2">
              <select
                value={newAddCat}
                onChange={(e) => setNewAddCat(e.target.value)}
                aria-label="Kategori biaya baru"
                className={`${inputCls} flex-1`}
              >
                {ADD_COST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={newAddAmount}
                onChange={(e) => setNewAddAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAdditional()}
                placeholder="Nominal"
                inputMode="numeric"
                className={`${inputCls} w-32`}
              />
              <button
                onClick={addAdditional}
                className={addBtn}
                aria-label="Tambah biaya lain"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            {addError && (
              <p className="rounded-lg bg-coral-light/30 px-2 py-1 text-xs text-error">
                {addError}
              </p>
            )}
            <p className="text-xs text-primary-dark/60">
              Biaya lain dibagi rata ke semua {session.playerIds.length} pemain sesi.
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {session.additionalCosts.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card"
              >
                {editingAdd === a.id ? (
                  <div className="space-y-2">
                    <input
                      value={addNameDraft}
                      onChange={(e) => setAddNameDraft(e.target.value)}
                      placeholder="Nama biaya"
                      aria-label="Nama biaya"
                      className={`${inputCls} w-full`}
                    />
                    <div className="flex gap-2">
                      <select
                        value={addCatDraft}
                        onChange={(e) => setAddCatDraft(e.target.value)}
                        aria-label="Kategori biaya"
                        className={`${inputCls} flex-1`}
                      >
                        {!(ADD_COST_CATEGORIES as readonly string[]).includes(
                          addCatDraft,
                        ) && <option value={addCatDraft}>{addCatDraft}</option>}
                        {ADD_COST_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        value={addAmountDraft}
                        onChange={(e) => setAddAmountDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveAdditional(a.id)}
                        placeholder="Nominal"
                        inputMode="numeric"
                        aria-label="Nominal biaya"
                        className={`${inputCls} w-32`}
                      />
                      <button
                        onClick={() => saveAdditional(a.id)}
                        className="press inline-flex shrink-0 items-center justify-center rounded-full bg-primary-bg px-3 text-sm font-extrabold text-primary-dark transition-colors duration-150 hover:bg-primary-light/25"
                        aria-label="Simpan biaya"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingAdd(null);
                          setAddError("");
                        }}
                        className="press inline-flex shrink-0 items-center justify-center rounded-full bg-primary-bg px-3 text-primary-dark/70 transition-colors duration-150 hover:bg-primary-light/25"
                        aria-label="Batal ubah biaya"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-primary-dark">
                      {a.name}{" "}
                      <span className="font-normal text-primary-dark/70">
                        · {a.category}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-primary-dark/70">
                      {formatIDR(a.amount)}
                      <button
                        onClick={() => {
                          setEditingAdd(a.id);
                          setAddNameDraft(a.name);
                          setAddCatDraft(a.category);
                          setAddAmountDraft(String(a.amount));
                          setAddError("");
                        }}
                        className="text-xs text-primary-dark/60"
                      >
                        Ubah
                      </button>
                      <button
                        onClick={() => removeAdditional(a.id)}
                        className="text-coral"
                        aria-label="Hapus biaya"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                )}
              </div>
            ))}
            {session.additionalCosts.length === 0 && (
              <p className="text-sm text-primary-dark/60">Belum ada biaya tambahan.</p>
            )}
          </div>
        </div>
      )}

      {active === "payments" && calc && (
        <div className="mt-4">
          <div className="rounded-lg bg-primary-bg p-4 text-sm text-primary-dark">
            <div className="flex justify-between"><span>Terkumpul</span><span className="font-extrabold text-primary">{formatIDR(collected)}</span></div>
            <div className="flex justify-between"><span>Sisa</span><span className="font-extrabold text-primary-dark">{formatIDR(calc.allocatedTotal - collected)}</span></div>
            <p className="mt-1 text-xs text-primary-dark/70">{paidCount}/{session.playerIds.length} lunas</p>
          </div>
          <div className="mt-3 rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-primary-dark">
              <QrIcon className="h-5 w-5" /> QR Pembayaran
            </p>
            <p className="mt-1 text-xs text-primary-dark/70">Upload QR (QRIS / e-wallet / m-banking) — temanmu bisa scan dari halaman ini atau halaman join.</p>
            <input
              ref={qrInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handleQrFile(e.target.files?.[0]); e.target.value = ""; }}
            />
            {session.paymentQr ? (
              <div className="mt-3">
                <img src={session.paymentQr} alt="QR pembayaran sesi" className="mx-auto w-full max-w-60 rounded-lg border border-primary-light/40" />
                <div className="mt-3 flex gap-2">
                  <button onClick={() => qrInputRef.current?.click()} className="press inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-primary px-4 py-2 text-sm font-extrabold text-primary-dark hover:bg-primary-bg">
                    <UploadIcon className="h-4 w-4" /> Ganti QR
                  </button>
                  <button onClick={removeQr} className="press inline-flex items-center justify-center gap-1.5 rounded-full bg-coral px-4 py-2 text-sm font-extrabold text-white shadow-coral-glow" aria-label="Hapus QR pembayaran">
                    <XIcon className="h-4 w-4" /> Hapus
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => qrInputRef.current?.click()} className="press mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-accent-light to-accent px-6 py-3 text-sm font-extrabold text-on-accent shadow-accent-glow">
                <UploadIcon className="h-4 w-4" /> Upload QR
              </button>
            )}
            {qrError && <p className="mt-2 rounded-lg bg-coral-light/30 px-2 py-1 text-xs text-error">{qrError}</p>}
          </div>
          <div className="mt-3 space-y-2">
            {session.playerIds.map((pid) => {
              const paid = session.payments[pid] === "paid";
              return (
                <button
                  key={pid}
                  onClick={() => update((d) => togglePaid(d, id, pid))}
                  className="press flex w-full items-center justify-between rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card text-sm"
                >
                  <span className="font-medium text-primary-dark">{userName(pid)}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-primary-dark/70">{formatIDR(calc.perPlayer[pid]?.total ?? 0)}</span>
                    <span className={paid ? "text-success" : "text-primary-dark/30"}>
                      {paid ? <CheckIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);
  if (!id) return <main className="py-10 text-sm text-primary-dark/70">Memuat…</main>;
  return (
    <Suspense>
      <DetailBody id={id} />
    </Suspense>
  );
}
