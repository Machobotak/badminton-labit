import Link from "next/link";
import { CourtIcon } from "../components/icons";
import { btnPrimary, btnSecondary, cardCls, scoreCls } from "../components/ui";

const PROBLEMS = [
  "Satu yang bayar duluan, nagihnya setengah mati.",
  "Kok dipakai sebagian orang, tapi biayanya dibagi rata semua.",
  "Selisih Rp1–Rp5 bikin total nggak pernah pas.",
];

const STEPS = [
  "Buat sesi: lapangan, kok, biaya tambahan.",
  "Tandai siapa main di mana — tagihan dihitung otomatis.",
  "Share link, pemain join, bayar, centang lunas.",
];

const EXAMPLE_ROWS = [
  { name: "Bima", amount: "Rp50.000", paid: true },
  { name: "Rina", amount: "Rp50.000", paid: true },
  { name: "Sinta", amount: "Rp35.000", paid: false },
  { name: "Yoga", amount: "Rp35.000", paid: false },
];

export default function Landing() {
  return (
    <main className="py-10 md:py-16">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-card px-3 py-1 text-xs font-medium text-fg-muted">
            <CourtIcon className="h-4 w-4 text-primary" />
            Badminton Split
          </span>
          <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-fg md:text-5xl">
            Patungan badminton tanpa drama.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-fg-muted md:text-base">
            Sewa 2 lapangan, 8 pemain, kok beda-beda — tagihan dihitung otomatis
            dan adil sampai rupiah terakhir. Tinggal main, sisanya beres.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className={`${btnPrimary} w-full sm:w-auto`}>
              Masuk
            </Link>
            <Link href="/register" className={`${btnSecondary} w-full sm:w-auto`}>
              Daftar
            </Link>
          </div>
        </div>

        <div className={`${scoreCls} p-4`}>
          <p className="text-xs font-medium text-white/70">Contoh</p>
          <div className="mt-3 divide-y divide-white/15 border-y border-white/15">
            {EXAMPLE_ROWS.map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="text-sm font-medium text-white">{row.name}</span>
                <span className="flex items-center gap-2">
                  <span className="tnum text-sm font-semibold text-white">
                    {row.amount}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${row.paid ? "bg-success" : "bg-warning"}`}
                  />
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-white/70">Total</span>
            <span className="tnum text-lg font-semibold text-white">
              Rp170.000
            </span>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="text-lg font-semibold text-fg">Kenapa ribet selama ini?</h2>
        <ol className="mt-4 divide-y divide-border border-y border-border">
          {PROBLEMS.map((text, i) => (
            <li key={text} className="flex items-baseline gap-4 py-3">
              <span className="text-sm font-semibold text-fg-subtle tabular-nums">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-fg-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-fg">Cara kerja</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {STEPS.map((text, i) => (
            <li key={text} className={cardCls}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-bg text-xs font-semibold text-primary tabular-nums">
                {i + 1}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-12 text-center text-xs text-fg-subtle">
        Data sesimu tersimpan di akunmu — bisa diakses dari perangkat mana saja.
      </p>
    </main>
  );
}
