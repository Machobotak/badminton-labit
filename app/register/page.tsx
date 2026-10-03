"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { ShuttlecockIcon } from "../../components/icons";
import { btnPrimary, cardCls, inputCls, labelCls } from "../../components/ui";

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
    <main className="mx-auto w-full max-w-sm py-10 md:py-16">
      <div className={cardCls}>
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-bg">
            <ShuttlecockIcon className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Badminton Split</p>
            <p className="truncate text-xs text-fg-muted">
              Buat akun untuk mulai mencatat sesi badminton.
            </p>
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fg">Daftar</h1>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className={labelCls} htmlFor="reg-name">
              Nama
            </label>
            <input
              id="reg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Rina"
              className={`${inputCls} mt-1.5`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cth. rina@example.com"
              className={`${inputCls} mt-1.5`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="reg-pass">
              Password
            </label>
            <input
              id="reg-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="minimal 6 karakter"
              className={`${inputCls} mt-1.5`}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-feedback-bg px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className={`${btnPrimary} w-full`}
          >
            {busy ? "Memproses…" : "Buat akun"}
          </button>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-fg-muted">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
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
