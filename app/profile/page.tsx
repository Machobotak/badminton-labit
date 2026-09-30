"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { currentUser } from "../../lib/mutations";
import { useApp } from "../../lib/useApp";
import { createClient } from "../../lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const { data, loading, updateProfile } = useApp();
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const me = data ? currentUser(data) : null;
  const editing = name !== null;

  useEffect(() => {
    if (data && !me) router.replace("/login?next=/profile");
  }, [data, me, router]);

  const saveName = async () => {
    const v = (name ?? "").trim();
    if (v.length === 0) return;
    setSaving(true);
    try {
      await updateProfile(v);
      setName(null);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading || !data || !me) {
    return <main className="py-10 text-sm text-primary-dark/70">Memuat…</main>;
  }

  return (
    <main className="py-6 md:py-10">
      <h1 className="text-xl font-extrabold text-primary-dark">Profil</h1>
      <div className="mt-4 rounded-lg border-l-4 border-primary-light bg-surface-card p-4 shadow-card">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-bg text-xl font-extrabold text-primary-dark">
          {me.name.slice(0, 1).toUpperCase()}
        </div>
        {editing ? (
          <div className="mt-3 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border-2 border-primary-light bg-cream px-4 py-2.5 text-sm text-primary-dark outline-none placeholder:text-primary-dark/50 focus:border-primary focus:shadow-focus"
            />
            <button
              onClick={saveName}
              disabled={saving}
              className="press inline-flex items-center justify-center rounded-full bg-gradient-to-b from-accent-light to-accent px-6 py-3 text-sm font-extrabold text-on-accent shadow-accent-glow disabled:opacity-60"
            >
              {saving ? "…" : "Simpan"}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="font-extrabold text-primary-dark">{me.name}</p>
              <p className="text-sm text-primary-dark/70">{data.currentUserEmail ?? "tanpa email"}</p>
            </div>
            <button
              onClick={() => setName(me.name)}
              className="press inline-flex items-center justify-center rounded-full border-2 border-primary px-6 py-3 text-sm font-extrabold text-primary-dark hover:bg-primary-bg"
            >
              Ubah
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <button
          onClick={logout}
          className="press inline-flex w-full items-center justify-center rounded-full border-2 border-primary px-6 py-3 text-sm font-extrabold text-primary-dark hover:bg-primary-bg"
        >
          Keluar
        </button>
      </div>
    </main>
  );
}
