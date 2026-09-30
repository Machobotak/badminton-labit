"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { ShuttlecockIcon } from "../../components/icons";

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
    <main className="py-10 md:py-16">
      <p className="flex items-center gap-2 text-sm font-extrabold text-primary-dark">
        <ShuttlecockIcon className="h-5 w-5" />
        Badminton Split
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-primary-dark">Masuk</h1>
      <p className="mt-1 text-sm text-primary-dark/70">
        Masuk dengan akunmu untuk melihat sesi badminton.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <label className="text-sm font-extrabold text-primary-dark" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cth. ayub@example.com"
            className="mt-1 w-full rounded-lg border-2 border-primary-light bg-cream px-4 py-2.5 text-sm text-primary-dark outline-none placeholder:text-primary-dark/50 focus:border-primary focus:shadow-focus"
          />
        </div>
        <div>
          <label className="text-sm font-extrabold text-primary-dark" htmlFor="login-pass">
            Password
          </label>
          <input
            id="login-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            className="mt-1 w-full rounded-lg border-2 border-primary-light bg-cream px-4 py-2.5 text-sm text-primary-dark outline-none placeholder:text-primary-dark/50 focus:border-primary focus:shadow-focus"
          />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="press inline-flex w-full items-center justify-center rounded-full bg-gradient-to-b from-accent-light to-accent px-6 py-3 text-sm font-extrabold text-on-accent shadow-accent-glow disabled:opacity-60"
        >
          {busy ? "Memproses…" : "Masuk"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-primary-dark/70">
        Belum punya akun?{" "}
        <Link href="/register" className="font-extrabold text-primary-dark hover:underline">
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
