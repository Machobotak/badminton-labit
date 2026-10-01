/**
 * Kelas bersama untuk kontrol yang berulang.
 *
 * Sebelumnya setiap halaman mendefinisikan ulang `inputCls`, `btnPrimary`,
 * dan `addBtn` dengan variasi berbeda (garis 2px vs 1px, latar krem vs
 * permukaan kartu), jadi kontrol yang sama tampil beda antar halaman.
 * Semua definisi kini ada di satu tempat: mengubah tampilan kontrol berarti
 * mengubah satu baris.
 *
 * Radius dipakai secara fungsi:
 * - `rounded-lg` untuk bidang dan kartu,
 * - `rounded-full` hanya untuk kapsul berisi teks pendek (tombol, pil filter,
 *   lencana) dan sasaran ketuk bulat.
 */

/** Bidang isian dan pilihan. Perubahan tinggi dijaga oleh `py-2.5`. */
export const inputCls =
  "w-full rounded-lg border border-border bg-input-bg px-3.5 py-2.5 text-sm text-fg outline-none transition-colors duration-150 placeholder:text-fg-subtle focus:border-primary focus:shadow-focus";

/** Bidang isian kecil di dalam baris ringkas (mis. editor harga). */
export const inputCompactCls =
  "rounded-lg border border-border bg-input-bg px-2.5 py-1.5 text-sm text-fg outline-none transition-colors duration-150 focus:border-primary focus:shadow-focus";

/** Tombol utama: aksen kuning, satu-satunya elemen yang "berteriak". */
export const btnPrimary =
  "press inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent hover:bg-accent-light disabled:opacity-60";

/** Tombol sekunder: netral, dipakai untuk aksi pendamping. */
export const btnSecondary =
  "press inline-flex items-center justify-center gap-1.5 rounded-full border border-primary bg-transparent px-6 py-3 text-sm font-semibold text-primary hover:bg-primary-bg disabled:opacity-60";

/** Tombol destruktif: tidak pernah jadi aksi utama suatu layar. */
export const btnDanger =
  "press inline-flex items-center justify-center gap-1.5 rounded-full bg-coral-dark px-6 py-3 text-sm font-semibold text-on-solid hover:bg-coral disabled:opacity-60";

/** Sasaran ketuk 36px berisi ikon saja. */
export const btnIcon =
  "press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-neutral-bg hover:text-fg";

/** Kartu standar: permukaan putih, garis tipis, tanpa garis aksen kiri. */
export const cardCls =
  "rounded-lg border border-border bg-surface-card p-4 shadow-card";

/** Label di atas bidang isian. */
export const labelCls = "block text-sm font-medium text-fg";

/** Pil filter/tab yang bisa dipilih. */
export const pillCls =
  "press shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold";

/** Keadaan pil: aktif memakai permukaan solid, non-aktif netral. */
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
  "press inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-accent text-on-accent hover:bg-accent-light disabled:opacity-60";

/** Chip sakelar: pilih pemain di suatu item, tandai lunas. */
export const chipCls =
  "press inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold";

/** Keadaan chip sakelar. */
export function chipState(on: boolean): string {
  return on
    ? "bg-primary text-on-solid"
    : "border border-border bg-surface-card text-fg-muted hover:bg-neutral-bg hover:text-fg";
}
