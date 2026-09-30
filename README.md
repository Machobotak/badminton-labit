# Badminton Split

Aplikasi split biaya badminton (Bahasa Indonesia). Next.js 16 App Router +
Supabase (Postgres + Auth). Data tersimpan di database, bukan lagi di
localStorage — sesi milik akun, bisa diakses dari perangkat mana saja.

## Setup

1. **Buat project Supabase**, lalu jalankan migration skema:
   buka *SQL Editor* di dashboard Supabase dan tempel isi
   `supabase/migrations/0001_init.sql`, atau (dengan Supabase CLI)
   `supabase db push`. Ini membuat tabel `public.profiles` dan
   `public.sessions`, trigger `handle_new_user`, serta policy RLS.
   File-nya idempoten (`drop ... if exists` / `create ... if not exists`),
   jadi tempel ulang seluruh isinya untuk memutakhirkan project yang sudah
   pernah menjalankan versi sebelumnya.

2. **Env** — salin `.env.example` ke `.env.local`, isi tiga variabel:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan
   `SUPABASE_SERVICE_ROLE_KEY` (server-only; dipakai endpoint publik
   by-share-code). Tanpa ketiganya, halaman akan menampilkan error setup.

3. Jalankan:

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit test (node --test, tanpa dependency tambahan)
npm run build      # production build
```

Daftar akun di `/register`, lalu buat sesi di `/dashboard`.

## Arsitektur

- `app/api/**` — API Routes (monolith, Next.js). Semua baca/tulis lewat sini;
  client tak pernah menyentuh DB langsung.
- `lib/supabase/{client,server,admin}.ts` — tiga Supabase client: browser
  (auth), server per-request (RLS aktif), dan service_role (`createServiceRoleClient`,
  bypass RLS). Yang ketiga dipakai untuk operasi yang memang mustahil dilakukan
  client user: baca sesi lewat kode share sebelum jadi anggota, baca profil
  pemain **lain** (policy `profiles_select_own` hanya mengizinkan baris sendiri),
  dan insert tamu adhoc — `insert(...).select()` dari client user ditolak policy
  SELECT `profiles_select_own` (error 42501) dan barisnya ikut rollback.
  Setiap pemakaian harus memvalidasi hak pemanggil sendiri; payload yang keluar
  tetap dibatasi `id` + `name`.
- `lib/useApp.ts` — pengganti `useStore` lama. Memuat `AppData` dan menyalinnya
  ke `dataRef` (cermin terbaru). `update(fn)` menghitung diff dari salinan
  `dataRef` **di luar** updater React — StrictMode dev memanggil updater dua
  kali, jadi efek jaringan di dalamnya akan mengirim PATCH ganda — lalu
  mengantrekan tiap diff ke `PATCH /api/sessions/[id]` lewat antrean serial.
  `lib/diff.ts` menghitung diff-nya (murni, teruji).
- `lib/db.ts` — pemetaan baris⇄objek, sanitizer input, dan `cascadeRemovePlayer`.
- `lib/calculation.ts` — math split (logika tidak berubah sejak versi awal).
- `proxy.ts` — refresh session Supabase tiap request (konvensi `proxy.ts`
  menggantikan `middleware.ts` di Next 16).

### Model data

Satu tabel `profiles` menampung **semua** pemain: akun asli (`id =
auth.users.id`, `auth_id` terisi) maupun tamu adhoc yang dibuat lewat "Tambah
pemain" (`id` acak, `auth_id` null). Karena `calculateSession(s)` memakan objek
`Session` bersarang, struktur `courts`/`shuttlecocks`/`additional_costs`/
`payments` disimpan sebagai kolom `jsonb` dan `playerIds` sebagai `uuid[]` —
tanpa tabel anak, tanpa mengubah math. Semua id di dalamnya merujuk
`profiles.id`.

`profiles` **tidak menyimpan email**. Kolomnya sengaja tidak ada di skema:
`profiles` dibaca lewat PostgREST dengan anon key yang ikut ter-bundle ke
browser, jadi kolom duplikat dari `auth.users.email` akan bocor ke pengunjung
mana pun. Satu-satunya sumber email adalah `auth.users`, dan hanya
`/api/me` yang mengembalikannya (untuk pemilik akun sendiri). Payload pemain
lain (`users[]` di semua endpoint sesi, termasuk preview publik `/s/<code>`)
hanya berisi `id` + `name`.

Policy RLS `profiles_select_own` (`auth_id = auth.uid()`) membatasi baca
langsung ke baris sendiri. Nama pemain lain selalu dirakit server-side oleh
`sessionPayload` memakai service_role, jadi tabelnya tidak perlu bisa diintip
pemegang anon key.

## API

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/me` | Profil user yang login |
| PATCH | `/api/me` | `{name}` |
| GET | `/api/sessions` | Semua sesi yang terlihat (kreator/peserta) + profil pemain |
| POST | `/api/sessions` | Buat sesi (wizard 6 langkah) |
| GET | `/api/sessions/[id]` | Satu sesi + pemain |
| PATCH | `/api/sessions/[id]` | Update parsial + cascade saat `playerIds` menyusut |
| POST | `/api/sessions/[id]/players` | `{name}` (tamu baru) atau `{profileId}` |
| GET | `/api/sessions/by-code/[code]` | Preview publik undangan |
| POST | `/api/sessions/by-code/[code]/join` | Join sesi (wajib login) |
