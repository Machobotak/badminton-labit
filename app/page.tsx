import Link from "next/link";
import { BanknoteIcon, CalculatorIcon, ReceiptIcon, ShuttlecockIcon } from "../components/icons";

const card = "rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card";
const sectionTitle = "border-b-2 border-dashed border-primary-light pb-2 text-lg font-extrabold text-primary-dark";
export default function Landing() {
  return (
    <main className="py-10 md:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-extrabold text-primary-dark">
          <ShuttlecockIcon className="h-5 w-5" />
          Badminton Split
        </p>
        <h1 className="mt-2 text-3xl md:text-5xl font-extrabold leading-tight text-primary-dark">
          Patungan badminton tanpa drama.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-primary-dark/80">
          Sewa 2 lapangan, 8 pemain, kok beda-beda — tagihan dihitung otomatis dan
          adil sampai rupiah terakhir. Tinggal main, sisanya beres.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="press inline-flex items-center justify-center rounded-full bg-gradient-to-b from-accent-light to-accent px-6 py-3 text-sm font-extrabold text-on-accent shadow-accent-glow flex-1"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="press inline-flex items-center justify-center rounded-full border-2 border-primary px-6 py-3 text-sm font-extrabold text-primary-dark hover:bg-primary-bg flex-1"
          >
            Daftar
          </Link>
        </div>
      </div>

      <h2 className={`mt-10 ${sectionTitle}`}>Kenapa ribet selama ini?</h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-primary-dark font-medium">
        <li className={card}>
          <BanknoteIcon className="mb-2 h-5 w-5 text-primary" />
          Satu yang bayar duluan, nagihnya setengah mati.
        </li>
        <li className={card}>
          <ReceiptIcon className="mb-2 h-5 w-5 text-primary" />
          Kok dipakai sebagian orang, tapi biayanya dibagi rata semua.
        </li>
        <li className={card}>
          <CalculatorIcon className="mb-2 h-5 w-5 text-primary" />
          Selisih Rp1–Rp5 bikin total nggak pernah pas.
        </li>
      </ul>

      <h2 className={`mt-8 ${sectionTitle}`}>Cara kerja</h2>
      <ol className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-primary-dark font-medium">
        <li className={card}>
          <span className="font-extrabold">1.</span> Buat sesi: lapangan, kok, biaya tambahan.
        </li>
        <li className={card}>
          <span className="font-extrabold">2.</span> Tandai siapa main di mana — tagihan dihitung otomatis.
        </li>
        <li className={card}>
          <span className="font-extrabold">3.</span> Share link, pemain join, bayar, centang lunas.
        </li>
      </ol>

      <p className="mt-10 text-center text-xs text-primary-dark/50">
        Data sesimu tersimpan di akunmu — bisa diakses dari perangkat mana saja.
      </p>
    </main>
  );
}
