"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, ExpandIcon, XIcon } from "./icons";

/** Tipe + ekstensi berkas untuk `paymentQr` yang berupa data-URL. */
function qrImageType(src: string): { mime: string; ext: string } {
  const m = /^data:image\/([a-z0-9.+-]+)[;,]/i.exec(src);
  const sub = (m?.[1] ?? "png").toLowerCase();
  if (sub === "jpeg" || sub === "jpg") return { mime: "image/jpeg", ext: "jpg" };
  if (sub === "svg+xml") return { mime: "image/svg+xml", ext: "svg" };
  return { mime: `image/${sub}`, ext: sub };
}

/** Isi data-URL sebagai byte; `null` kalau sumbernya bukan data-URL. */
function dataUrlBytes(src: string): Uint8Array<ArrayBuffer> | null {
  if (!src.startsWith("data:")) return null;
  const comma = src.indexOf(",");
  if (comma < 0) return null;
  const meta = src.slice(5, comma);
  const payload = src.slice(comma + 1);
  const decoded = meta.endsWith(";base64")
    ? atob(payload)
    : decodeURIComponent(payload);
  const bytes = new Uint8Array(new ArrayBuffer(decoded.length));
  for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
  return bytes;
}

/** Buang karakter yang tidak aman dipakai sebagai nama berkas. */
function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 80) : "qr-pembayaran";
}

/**
 * Gambar QR pembayaran yang bisa diketuk untuk diperbesar, lengkap dengan
 * tombol unduh.
 *
 * Tombolnya berupa `<button>` berisi gambar, bukan `<img onClick>`: mode zoom
 * jadi bisa dibuka dengan Enter/Space dan terbaca pembaca layar sebagai satu
 * kontrol. Saat modal terbuka, klik latar, tombol Tutup, dan Esc menutupnya;
 * fokus awal diarahkan ke tombol Tutup (juga sasaran Tab pertama) supaya
 * keyboard tidak tersangkut di balik latar.
 *
 * Unduhan memakai Blob dari isi data-URL, bukan atribut `download` pada
 * `<a href="data:…">`, karena sebagian browser mengabaikannya untuk data-URL.
 */
export function QrImage({
  src,
  alt,
  fileName = "qr-pembayaran",
  className = "",
}: {
  src: string;
  alt: string;
  /** Nama berkas tanpa ekstensi; ekstensi mengikuti tipe gambar. */
  fileName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { mime, ext } = qrImageType(src);
  const downloadName = `${safeFileName(fileName)}.${ext}`;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const download = () => {
    const bytes = dataUrlBytes(src);
    const url = bytes ? URL.createObjectURL(new Blob([bytes], { type: mime })) : src;
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (bytes) setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${alt} — ketuk untuk memperbesar`}
        className={`group relative mx-auto block w-full max-w-60 overflow-hidden rounded-lg border border-border ${className}`}
      >
        <img src={src} alt={alt} className="block w-full" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3 py-1.5 text-xs font-semibold text-fg">
            <ExpandIcon className="h-4 w-4" /> Perbesar
          </span>
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau ${alt}`}
          className="animate-row-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex w-full max-w-lg flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/*
              `w-full` + `max-h` dalam satuan vmin: QR selalu memakai ruang
              terbesar yang tersedia, termasuk membesar dari ukuran aslinya —
              itulah gunanya mode perbesar, karena QR perlu cukup besar untuk
              dipindai dari ponsel lain.
            */}
            <img
              src={src}
              alt={alt}
              className="mx-auto h-auto max-h-[75vmin] w-full max-w-lg rounded-xl bg-surface-card object-contain"
            />
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={download}
                className="press inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-light"
              >
                <DownloadIcon className="h-4 w-4" /> Unduh Gambar
              </button>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="press inline-flex items-center justify-center gap-1.5 rounded-full border border-border-strong bg-surface-card px-5 py-2.5 text-sm font-semibold text-fg hover:bg-neutral-bg"
              >
                <XIcon className="h-4 w-4" /> Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
