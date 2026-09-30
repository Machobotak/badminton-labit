-- Badminton Split: initial schema (Supabase Postgres).
--
-- Model: satu tabel `profiles` untuk SEMUA pemain (akun asli + tamu adhoc),
-- dan satu tabel `sessions` dengan kolom jsonb untuk struktur nested
-- (courts/shuttlecocks/additional_costs/payments) agar math `calculateSession`
-- tidak berubah sama sekali.
--
-- Jalankan sekali via Supabase Dashboard > SQL Editor, atau:
--   supabase db push   (jika memakai Supabase CLI dengan folder ini)

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  -- Untuk akun asli: id = auth.users.id (diisi trigger handle_new_user).
  -- Untuk tamu adhoc ("Tambah pemain"): id = uuid acak, auth_id null.
  id uuid primary key,
  auth_id uuid unique references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- sessions
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles (id) on delete set null,
  name text not null,
  date text not null,
  start_time text not null default '',
  end_time text not null default '',
  location text not null default '',
  notes text,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'completed')),
  share_code text not null unique,
  -- Semua id di sini merujuk ke public.profiles(id).
  player_ids uuid[] not null default '{}',
  courts jsonb not null default '[]',
  shuttlecocks jsonb not null default '[]',
  additional_costs jsonb not null default '[]',
  -- payments: {"<profile_id>": "pending" | "paid"}
  payments jsonb not null default '{}',
  -- Data-URL gambar QR (hasil resize client, maks ~700KB).
  payment_qr text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_creator_idx on public.sessions (creator_id);
create index if not exists sessions_share_code_idx on public.sessions (share_code);
create index if not exists sessions_player_ids_idx on public.sessions using gin (player_ids);

-- ------------------------------------------------------- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists sessions_touch on public.sessions;
create trigger sessions_touch
  before update on public.sessions
  for each row execute function public.touch_updated_at();

-- ------------------------------------------- auto-profile untuk user auth baru
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'Pemain'
  );
  insert into public.profiles (id, auth_id, name)
  values (new.id, new.id, display_name)
  on conflict (id) do update set
    auth_id = excluded.auth_id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;

-- profiles: hanya baris milik sendiri yang boleh dibaca lewat PostgREST.
-- Nama pemain lain (kartu pemain, halaman join /s/<code>) selalu dirakit
-- `sessionPayload` di server memakai service_role; tabelnya sendiri tidak
-- perlu bisa diintip siapa pun yang memegang anon key dari bundle publik.
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth_id = auth.uid());

-- Insert: akun sendiri (dipakai trigger; trigger bypass RLS) atau tamu adhoc.
drop policy if exists "profiles_insert_self_or_guest" on public.profiles;
create policy "profiles_insert_self_or_guest"
  on public.profiles for insert to authenticated
  with check (auth_id = auth.uid() or auth_id is null);

-- Update: hanya baris milik sendiri.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

-- sessions: hanya kreator + anggota yang bisa baca/ubah.
-- (Akses publik via kode share dilayani API route dengan service_role.)
drop policy if exists "sessions_select_member" on public.sessions;
create policy "sessions_select_member"
  on public.sessions for select to authenticated
  using (creator_id = auth.uid() or auth.uid() = any (player_ids));

drop policy if exists "sessions_insert_creator" on public.sessions;
create policy "sessions_insert_creator"
  on public.sessions for insert to authenticated
  with check (creator_id = auth.uid());

drop policy if exists "sessions_update_member" on public.sessions;
create policy "sessions_update_member"
  on public.sessions for update to authenticated
  using (creator_id = auth.uid() or auth.uid() = any (player_ids))
  with check (creator_id = auth.uid() or auth.uid() = any (player_ids));

drop policy if exists "sessions_delete_creator" on public.sessions;
create policy "sessions_delete_creator"
  on public.sessions for delete to authenticated
  using (creator_id = auth.uid());

-- Email sengaja TIDAK disimpan di sini. `auth.users.email` satu-satunya sumber;
-- kolom duplikat di tabel yang dibaca anggota sesi lain membuat email bisa
-- bocor lewat `select *` (anon key ada di bundle publik), padahal app hanya
-- perlu `id` + `name` pemain lain. Diletakkan di akhir file — setelah
-- `handle_new_user` versi baru dipasang — supaya versi lama fungsi itu (yang
-- menulis kolom email) tidak pernah hidup tanpa kolomnya.
alter table public.profiles drop column if exists email;
