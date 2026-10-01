"use client";

import { useEffect, useId, useRef } from "react";
import { AlertIcon } from "./icons";

/**
 * Dialog konfirmasi bawaan aplikasi, menggantikan `window.confirm` yang
 * tampilannya milik browser dan tidak mengikuti tema.
 *
 * - Esc dan klik latar menutup dialog; fokus dipindah ke tombol batal saat
 *   dibuka dan dijaga tetap di dalam dialog (Tab tidak bocor ke halaman).
 * - `busy` menahan tombol selama aksi jalan, `error` menampilkan pesan gagal
 *   tanpa menutup dialog supaya pengguna bisa mencoba lagi.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Hapus",
  busyLabel = "Menghapus…",
  busy = false,
  error = "",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Fokus awal + kunci scroll hanya saat dialog dibuka/ditutup; `onCancel`
  // tidak ikut jadi dependensi supaya penulisan ulang inline di pemanggil
  // tidak memindahkan fokus kembali ke tombol Batal tiap render.
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Esc menutup, Tab berputar di dalam dialog. Efek ini boleh dipasang ulang
  // saat prop berubah: posisi fokus hanya diurus efek `[open]` di atas.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!busy) onCancel();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="animate-row-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-surface-card p-5 shadow-raised"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-feedback-bg text-error">
            <AlertIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
            <p id={descId} className="mt-1 text-sm text-fg-muted">
              {description}
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-feedback-bg px-3 py-2 text-sm text-error">{error}</p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="press flex-1 rounded-full border border-border-strong bg-surface-card px-6 py-3 text-sm font-semibold text-fg hover:bg-neutral-bg disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="press flex-1 rounded-full bg-coral-dark px-6 py-3 text-sm font-semibold text-on-solid hover:bg-coral disabled:opacity-60"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
