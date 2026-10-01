import Link from "next/link";
import { BanknoteIcon, CalculatorIcon, ReceiptIcon, ShuttlecockIcon } from "../components/icons";
import { btnPrimary, btnSecondary, cardCls } from "../components/ui";

const PROBLEMS = [
  { Icon: BanknoteIcon, text: "Satu yang bayar duluan, nagihnya setengah mati." },
  { Icon: ReceiptIcon, text: "Kok dipakai sebagian orang, tapi biayanya dibagi rata semua." },
  { Icon: CalculatorIcon, text: "Selisih Rp1–Rp5 bikin total nggak pernah pas." },
];

const STEPS = [
  "Buat sesi: lapangan, kok, biaya tambahan.",
  "Tandai siapa main di mana — tagihan dihitung otomatis.",
  "Share link, pemain join, bayar, centang lunas.",
];

export default function Landing() {
  return (
    <main className="py-10 md:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-card px-3 py-1 text-xs font-medium text-fg-muted">
          <ShuttlecockIcon className="h-4 w-4 text-primary" />
          Badminton Split
        </span>
        <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-fg md:text-5xl">
          Patungan badminton tanpa drama.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-fg-muted md:text-base">
          Sewa 2 lapangan, 8 pemain, kok beda-beda — tagihan dihitung otomatis
          dan adil sampai rupiah terakhir. Tinggal main, sisanya beres.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/login" className={`${btnPrimary} w-full sm:w-auto`}>
            Masuk
          </Link>
          <Link href="/register" className={`${btnSecondary} w-full sm:w-auto`}>
            Daftar
          </Link>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="text-lg font-semibold text-fg">Kenapa ribet selama ini?</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {PROBLEMS.map(({ Icon, text }) => (
            <li key={text} className={cardCls}>
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-fg">Cara kerja</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {STEPS.map((text, i) => (
            <li key={text} className={cardCls}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-bg text-xs font-semibold text-primary">
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
