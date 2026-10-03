# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Ketua mabar (organizer) sebagai pengguna utama — membuat sesi, menagih, menandai lunas, share link undangan. Momen pakai kritis: di lapangan/gor via HP, sering satu tangan, cahaya campur, waktu sempit antar game. Peserta sebagai pengguna sekunder — join lewat link/kode, cek tagihan sendiri, bayar, lihat status lunas.

## Product Purpose

Split biaya badminton yang adil sampai rupiah terakhir: sewa multi-lapangan, kok (beli per slope, pakai per butir), dan biaya tambahan dibagi hanya ke pemain yang memakai item itu. Sukses = ketua tidak perlu nagih manual dan tidak ada selisih pembulatan yang dipersoalkan; tagihan per orang langsung bisa ditagihkan setelah sesi dibuat.

## Positioning

Satu-satunya splitter yang memahami logika kok badminton Indonesia (harga per slope → biaya per butir terpakai) dan alokasi per-item per-pemain, bukan sekadar bagi rata total. Pesaing generik (split-bill umum) tidak bisa memodelkan "kok dipakai sebagian orang tapi biayanya dibagi rata semua" tanpa kerja manual.

## Operating Context

Alur: wizard 6 langkah (Info → Lapangan → Pemain → Kok → Biaya Lain → Review) → halaman detail sesi (overview, pemain, lapangan, kok, biaya lain, pembayaran) → share link/kode `/s/[code]` → peserta join (wajib login) → bayar → ketua centang lunas. Dipakai berkelompok 4–8+ pemain, berulang (mabar rutin mingguan). Data milik akun (Supabase Auth + Postgres RLS), bisa diakses dari perangkat mana saja; tamu adhoc (tanpa akun) dibuat ketua lewat "Tambah pemain". Bahasa UI: Bahasa Indonesia.

## Capabilities and Constraints

Fungsi yang WAJIB dipertahankan (keputusan user 2026-10-02): semua fitur & rute existing — `/`, `/login`, `/register`, `/dashboard` (filter status + hapus sesi), `/sessions/new` (wizard 6 langkah), `/sessions/[id]` (6 tab detail), `/s/[code]` (preview publik + join), `/profile`, `/api/me`, `/api/sessions*`. Math split (`lib/calculation.ts`) tidak berubah. Stack Next.js 16 App Router + Supabase (Auth, Postgres RLS, service_role hanya server-side). Mobile-first: ketua mengoperasikan dari HP di lapangan. Aksesibilitas: kontras WCAG AA (token sudah diukur), dialog konfirmasi hapus (fokus trap, Esc/backdrop close), reduced-motion dihormati.

## Brand Commitments

Nama: Badminton Split ("Patungan badminton tanpa drama"). Bahasa Indonesia, nada santai tapi tegas soal keadilan ("adil sampai rupiah terakhir"). Tidak ada logo/brand visual yang mengikat — dunia visual lama diperlakukan sebagai anti-referensi (keputusan redesign penuh).

## Evidence on Hand

Copy dan struktur existing di `app/**/page.tsx`, `components/ui.ts`, `app/globals.css`. Tidak ada testimoni, benchmark, aset foto, atau logo yang bisa dipakai — konten ilustratif harus ditulis dari nol dan diberi label sintetis bila perlu.

## Product Principles

1. Keadilan yang bisa diaudit — tiap rupiah tagihan bisa ditelusuri ke item dan pemakainya.
2. Ketua cepat, peserta jelas — aksi ketua (buat, tagih, centang) minimal ketuk; peserta langsung paham "saya bayar berapa, ke siapa".
3. Fakta lapangan menang — pemakaian kok/lapangan yang tercatat tidak diutak-atik turunan otomatis.
4. Berfungsi di gor — layar kecil, cahaya buruk, koneksi pas-pasan bukan edge case.
5. Tanpa drama sosial — copy dan alur meredakan ketegangan nagih-menagih, bukan menambahnya.
