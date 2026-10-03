---
version: 1
slug: "app"
primary_target: "app"
related_targets: []
---

# Surface brief — seluruh aplikasi (redesign Papan Lapangan)

## Scope

Seluruh aplikasi: shell + nav, landing `/`, auth, `/dashboard`, wizard `/sessions/new`, detail `/sessions/[id]` (6 tab), undangan `/s/[code]`, `/profile`, dialog, ikon. Mode utama Operate; landing ikut dunia yang sama.

## Audience & job

Ketua mabar di lapangan via HP: buat sesi, alokasi pemain per item, share link, centang lunas — minimal ketuk, terbaca di cahaya campur. Peserta: buka link, paham "bayar berapa, ke siapa", join, bayar.

## Direction

Papan Lapangan: dunia papan skor GOR + garis lapangan. Shell hijau gelanggang pekat, angka tagihan tabular seperti papan skor, garis lapangan putih sebagai pembagi dan penanda alokasi. Satu sans sistem, kepadatan ringkas, satu signature move: denah lapangan alokasi + papan-skor tagihan.

## Memorable moment

Tagihan per orang tampil seperti papan skor yang "terjepret" begitu alokasi berubah — angka besar tabular, status lunas/belum sebagai lampu papan, bukan badge generik.

## Unresolved

Ilustrasi/foto tidak ada dan tidak dibuat (tanpa image-gen); dunia dibawa warna, tipo, garis, dan signature move saja.

## Direction contract

THESIS: Satu layar menjawab "siapa bayar berapa, untuk apa" tanpa kartu generik bertumpuk. Menolak grid kartu ikon-plus-teks dan hero-metrik templat; setiap blok biaya digambar sebagai lajur lapangan dengan penghuninya.

OWN-WORLD: Hijau gelanggang pekat untuk shell dan status aktif; kuning kok hanya untuk aksi utama; dasar kertas terang bertekstur garis lapangan samar. Satu sans sistem, angka tabular, bobot tegas untuk nominal. Lajur biaya berkepala label seperti papan skor, pembagi garis putih hairline, chip pemain sebagai "penanda posisi". Gerak satu: angka papan skor menjepret saat total berubah (±200ms, hormati reduced-motion).

STORY: Ketua paham dalam 3 detik siapa belum bayar dan item mana belum terbagi; peserta paham nominal dan statusnya tanpa bertanya. Kepercayaan datang dari angka yang bisa ditelusuri ke lajurnya.

FIRST VIEWPORT: Dashboard mobile: header hijau pekat berisi salam + total tagihan bergulir dan tombol Buat Sesi kuning; di bawahnya filter status sebagai pil; daftar sesi sebagai lajur papan (nama, tanggal, nominal per orang terbesar, lampu status), aksi hapus di ujung lajur. Desktop: rel kiri hijau + konten lajur yang sama, tanpa kartu bersarang.

FORM: Papan Lapangan, kandidat 7 dari 7 arah grounded, seed key 9e36ed0f, kind assigned.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
