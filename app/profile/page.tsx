"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { currentUser } from "../../lib/mutations";
import { useApp } from "../../lib/useApp";
import { createClient } from "../../lib/supabase/client";
import { btnPrimary, btnSecondary, cardCls, inputCls } from "../../components/ui";

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
    return <main className="py-10 text-sm text-fg-muted">Memuat…</main>;
  }

  return (
    <main className="mx-auto w-full max-w-sm py-6 md:py-10">
      <h1 className="text-xl font-semibold tracking-tight text-fg">Profil</h1>

      <div className={`mt-4 ${cardCls}`}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-bg text-base font-semibold text-primary">
            {me.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-fg">{me.name}</p>
            <p className="truncate text-sm text-fg-muted">
              {data.currentUserEmail ?? "tanpa email"}
            </p>
          </div>
        </div>

        {editing ? (
          <form
            className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void saveName();
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama baru"
              aria-label="Nama baru"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={saving}
              className={`${btnPrimary} shrink-0 sm:px-5`}
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setName(me.name)}
            className={`${btnSecondary} mt-4 w-full`}
          >
            Ubah
          </button>
        )}
      </div>

      <button onClick={logout} className={`${btnSecondary} mt-4 w-full`}>
        Keluar
      </button>
    </main>
  );
}
