"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { ShuttlecockIcon } from "../../components/icons";

function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length === 0) {
      setError("Isi namamu dulu ya");
      return;
    }
    if (email.trim().length === 0 || password.length < 6) {
      setError("Email wajib diisi dan password minimal 6 karakter");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Tanpa `emailRedirectTo`, link konfirmasi memakai Site URL dari dashboard
      // Supabase. Kirim `next` sebagai query agar user kembali ke halaman tujuan.
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}${next || "/dashboard"}`,
      },
    });
    setBusy(false);
    if (authError) {
      // Supabase membatasi pengiriman email Auth (provider bawaan: 2/jam per
      // project). Tanpa pemetaan ini user hanya melihat pesan Inggris mentah.
      setError(
        authError.code === "over_email_send_rate_limit" ||
          /rate limit/i.test(authError.message)
          ? "Batas kirim email Supabase tercapai (maksimal 2 email/jam untuk provider bawaan). Coba lagi nanti atau hubungi admin."
          : authError.message,
      );
      return;
    }
    // Bila konfirmasi email aktif, session masih null sampai user klik link.
    if (!data.session) {
      setNotice("Akun dibuat. Cek email untuk konfirmasi sebelum masuk.");
      return;
    }
    router.push(next || "/dashboard");
    router.refresh();
  };

  return (
    <main className="py-10 md:py-16">
      <p className="flex items-center gap-2 text-sm font-extrabold text-primary-dark">
        <ShuttlecockIcon className="h-5 w-5" />
        Badminton Split
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-primary-dark">Daftar</h1>
      <p className="mt-1 text-sm text-primary-dark/70">
        Buat akun untuk mulai mencatat sesi badminton.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <label className="text-sm font-extrabold text-primary-dark" htmlFor="reg-name">
            Nama
          </label>
          <input
            id="reg-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="cth. Rina"
            className="mt-1 w-full rounded-lg border-2 border-primary-light bg-cream px-4 py-2.5 text-sm text-primary-dark outline-none placeholder:text-primary-dark/50 focus:border-primary focus:shadow-focus"
          />
        </div>
        <div>
          <label className="text-sm font-extrabold text-primary-dark" htmlFor="reg-email">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cth. rina@example.com"
            className="mt-1 w-full rounded-lg border-2 border-primary-light bg-cream px-4 py-2.5 text-sm text-primary-dark outline-none placeholder:text-primary-dark/50 focus:border-primary focus:shadow-focus"
          />
        </div>
        <div>
          <label className="text-sm font-extrabold text-primary-dark" htmlFor="reg-pass">
            Password
          </label>
          <input
            id="reg-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="minimal 6 karakter"
            className="mt-1 w-full rounded-lg border-2 border-primary-light bg-cream px-4 py-2.5 text-sm text-primary-dark outline-none placeholder:text-primary-dark/50 focus:border-primary focus:shadow-focus"
          />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        {notice && <p className="text-sm text-primary-dark">{notice}</p>}
        <button
          type="submit"
          disabled={busy}
          className="press inline-flex w-full items-center justify-center rounded-full bg-gradient-to-b from-accent-light to-accent px-6 py-3 text-sm font-extrabold text-on-accent shadow-accent-glow disabled:opacity-60"
        >
          {busy ? "Memproses…" : "Buat akun"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-primary-dark/70">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-extrabold text-primary-dark">
          Masuk
        </Link>
      </p>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
