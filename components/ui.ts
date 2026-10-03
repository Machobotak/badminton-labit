/**
 * Kelas bersama papan skor: kuning kok hanya untuk aksi utama,
 * hijau gelanggang untuk status aktif, lajur netral untuk kartu.
 */

/** Bidang isian dan pilihan. */
export const inputCls =
  "w-full rounded-lg border border-border bg-input-bg px-3.5 py-2.5 text-sm text-fg outline-none transition-colors duration-150 placeholder:text-fg-subtle focus:border-primary focus:shadow-focus";

/** Bidang isian kecil di dalam baris ringkas (mis. editor harga). */
export const inputCompactCls =
  "rounded-lg border border-border bg-input-bg px-2.5 py-1.5 text-sm text-fg outline-none transition-colors duration-150 focus:border-primary focus:shadow-focus";

/** Tombol utama: kuning kok di atas teks hijau pekat. */
export const btnPrimary =
  "press inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent hover:bg-[#ffd968] disabled:opacity-60";

/** Tombol sekunder: outline hijau gelanggang. */
export const btnSecondary =
  "press inline-flex items-center justify-center gap-1.5 rounded-full border border-primary bg-transparent px-6 py-3 text-sm font-semibold text-primary hover:bg-primary-bg disabled:opacity-60";

/** Tombol destruktif: tidak pernah jadi aksi utama suatu layar. */
export const btnDanger =
  "press inline-flex items-center justify-center gap-1.5 rounded-full bg-coral-dark px-6 py-3 text-sm font-semibold text-on-solid hover:bg-coral disabled:opacity-60";

/** Sasaran ketuk 36px berisi ikon saja. */
export const btnIcon =
  "press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-neutral-bg hover:text-fg";

/** Lajur netral: kartu tanpa aksen, pemisah mengandalkan garis 1px. */
export const cardCls =
  "rounded-[14px] border border-border bg-surface-card p-4 shadow-card";

/** Label di atas bidang isian. */
export const labelCls = "block text-sm font-medium text-fg";

/** Pil filter/tab yang bisa dipilih. */
export const pillCls =
  "press shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold";

/** Keadaan pil: aktif solid hijau/teks putih, non-aktif outline netral. */
export function pillState(active: boolean): string {
  return active
    ? "bg-primary text-on-solid"
    : "border border-border bg-surface-card text-fg-muted hover:bg-neutral-bg hover:text-fg";
}

/** Lencana status berukuran kecil. */
export const badgeCls =
  "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize";

/** Tombol "+" pada baris penambah cepat (lapangan, pemain, kok). */
export const btnAdd =
  "press inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-accent text-on-accent hover:bg-[#ffd968] disabled:opacity-60";

/** Chip sakelar: pilih pemain di suatu item, tandai lunas. */
export const chipCls =
  "press inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold";

/** Keadaan chip: nyala solid hijau, mati outline netral. */
export function chipState(on: boolean): string {
  return on
    ? "bg-primary text-on-solid"
    : "border border-border bg-surface-card text-fg-muted hover:bg-neutral-bg hover:text-fg";
}

/** Panel papan skor: hijau pekat + hairline garis lapangan + teks terang. */
export const scoreCls =
  "tnum rounded-[14px] border border-white/20 bg-[#0a2e2b] text-[#f6f3ea]";

/** Lampu status bayar: lunas hijau menyala, belum redup outline. */
export function lampState(paid: boolean): string {
  return paid
    ? "bg-success text-on-solid"
    : "border border-border-strong bg-transparent text-fg-muted";
}
