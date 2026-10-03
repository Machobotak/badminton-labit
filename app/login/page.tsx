"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { ShuttlecockIcon } from "../../components/icons";
import { btnPrimary, cardCls, inputCls, labelCls } from "../../components/ui";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().length === 0 || password.length === 0) {
      setError("Isi email dan password dulu ya");
      return;
    }
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (authError) {
      setError(authError.message);
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
              Masuk dengan akunmu untuk melihat sesi badminton.
            </p>
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fg">Masuk</h1>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className={labelCls} htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cth. ayub@example.com"
              className={`${inputCls} mt-1.5`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="login-pass">
              Password
            </label>
            <input
              id="login-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className={`${inputCls} mt-1.5`}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-feedback-bg px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className={`${btnPrimary} w-full`}
          >
            {busy ? "Memproses…" : "Masuk"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-fg-muted">
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Daftar
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
