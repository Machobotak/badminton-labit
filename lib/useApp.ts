"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type AppData } from "./api";
import { diffPatch } from "./diff";
import type { User } from "./types";

/** Pengganti `useStore` untuk versi DB. */
export interface UseApp {
  data: AppData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Mutasi lokal sinkron + sinkronisasi diff ke API (fire-and-forget). */
  update: (fn: (d: AppData) => void) => void;
  /** Tambah pemain baru (butuh nama → buat profil di server). */
  addPlayer: (sessionId: string, name: string) => Promise<void>;
  /** Simpan nama profil sendiri (PATCH /api/me). */
  updateProfile: (name: string) => Promise<void>;
}

export function useApp(): UseApp {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Turunan, bukan state: belum ada data DAN belum ada error = masih memuat.
  const loading = data === null && error === null;
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  // Cermin `data` yang selalu terbaru, dibaca oleh `update()` agar diff dihitung
  // dari snapshot nyata (bukan di dalam updater setState yang bisa dipanggil 2x).
  const dataRef = useRef<AppData | null>(null);

  // Rantai promise (bukan async/await di body effect) supaya tidak ada setState
  // sinkron saat effect pertama kali jalan.
  const reload = useCallback(
    () =>
      api
        .listSessions()
        .then(async (list) => {
          const me = await api.me().catch(() => null);
          const meUser: User | null = me ? me.user : null;
          // `me` WAJIB ikut masuk `users`: empat halaman memakai `currentUser()`
          // yang mencari `currentUserId` di dalam `users[]`. Sebelum ada sesi,
          // `users` dari server kosong sehingga semua halaman mengira belum login
          // dan melempar user ke /login (loop tak berujung setelah login sukses).
          const users =
            meUser && !list.users.some((u) => u.id === meUser.id)
              ? [...list.users, meUser]
              : list.users;
          const next: AppData = {
            users,
            sessions: list.sessions,
            currentUserId: meUser ? meUser.id : null,
            currentUserEmail: meUser?.email ?? null,
          };
          dataRef.current = next;
          setData(next);
          setError(null);
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Gagal memuat data");
        }),
    [],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const enqueue = useCallback(
    (task: () => Promise<unknown>): Promise<void> => {
      const next = queue.current.then(async () => {
        try {
          await task();
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Gagal menyimpan perubahan");
          void reload();
        }
      });
      queue.current = next;
      return next;
    },
    [reload],
  );

  const update = useCallback(
    (fn: (d: AppData) => void) => {
      // `dataRef` selalu snapshot terbaru. Diff dihitung DI LUAR updater karena
      // React (StrictMode dev) boleh memanggil updater dua kali — efek jaringan
      // di dalamnya akan mengirim PATCH ganda.
      const prev = dataRef.current;
      if (!prev) return;
      const before = new Map(prev.sessions.map((s) => [s.id, structuredClone(s)]));
      // Semua field identitas (users/currentUserId/currentUserEmail) ikut apa
      // adanya; hanya `sessions` yang boleh berubah lewat `fn`.
      const draft: AppData = {
        ...prev,
        sessions: prev.sessions.map((s) => structuredClone(s)),
      };
      fn(draft);

      for (const s of draft.sessions) {
        const old = before.get(s.id);
        if (!old) continue;
        const patch = diffPatch(old, s);
        if (!patch) continue;
        const id = s.id;
        enqueue(() => api.patchSession(id, patch));
      }
      dataRef.current = draft;
      setData(draft);
    },
    [enqueue],
  );

  const addPlayer = useCallback(
    (sessionId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return Promise.resolve();
      return new Promise<void>((resolve) => {
        enqueue(async () => {
          const res = await api.addPlayer(sessionId, trimmed);
          const prev = dataRef.current;
          if (prev) {
            const users = prev.users.some((u) => u.id === res.user.id)
              ? prev.users
              : [...prev.users, res.user];
            const next: AppData = {
              ...prev,
              users,
              sessions: prev.sessions.map((s) =>
                s.id === sessionId ? res.session : s,
              ),
            };
            dataRef.current = next;
            setData(next);
          }
        }).finally(resolve);
      });
    },
    [enqueue],
  );

  const updateProfile = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const res = await api.updateMe(trimmed);
    const prev = dataRef.current;
    if (!prev) return;
    // `res.user` dari /api/me memuat email; `users[]` sengaja bebas email,
    // jadi email dipindah ke `currentUserEmail`.
    const meUser: User = { id: res.user.id, name: res.user.name };
    const next: AppData = {
      ...prev,
      users: prev.users.map((u) => (u.id === meUser.id ? meUser : u)),
      currentUserEmail: res.user.email ?? null,
    };
    dataRef.current = next;
    setData(next);
  }, []);

  return { data, loading, error, reload, update, addPlayer, updateProfile };
}
