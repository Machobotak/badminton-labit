import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

/** Stub bagian yang disediakan Supabase (schema auth + auth.uid()). */
const SUPABASE_STUBS = `
create schema if not exists auth;
-- Supabase menyediakan role ini; policy "to authenticated" butuh role-nya ada.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
end $$;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
`;
const MIGRATION = readFileSync(
  new URL("./0001_init.sql", import.meta.url),
  "utf8",
);

async function freshDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(MIGRATION);
  return db;
}

test("migration applies on a clean database", async () => {
  const db = await freshDb();
  const t = await db.query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public' order by tablename",
  );
  assert.deepEqual(
    t.rows.map((r) => r.tablename),
    ["profiles", "sessions"],
  );
  const par = await db.query<{ relname: string }>(
    "select relname from pg_class where relname in ('profiles','sessions') and relrowsecurity",
  );
  assert.equal(par.rows.length, 2);
  await db.close();
});

test("new auth user gets a profile via handle_new_user trigger", async () => {
  const db = await freshDb();
  const uid = "11111111-1111-1111-1111-111111111111";
  await db.exec(
    `insert into auth.users (id, email, raw_user_meta_data)
     values ('${uid}', 'ayub@example.com', '{"name":"Ayub"}'::jsonb)`,
  );
  const p = await db.query<{ id: string; name: string; auth_id: string }>(
    "select id, name, auth_id from public.profiles",
  );
  assert.equal(p.rows.length, 1);
  assert.equal(p.rows[0].id, uid);
  assert.equal(p.rows[0].auth_id, uid);
  assert.equal(p.rows[0].name, "Ayub");
  await db.close();
});

test("guest profile insert (random id, auth_id null) is accepted", async () => {
  const db = await freshDb();
  const gid = "22222222-2222-2222-2222-222222222222";
  await db.exec(
    `insert into public.profiles (id, auth_id, name)
     values ('${gid}', null, 'Tamu')`,
  );
  const p = await db.query<{ id: string }>(
    `select id from public.profiles where auth_id is null`,
  );
  assert.equal(p.rows.length, 1);
  assert.equal(p.rows[0].id, gid);
  await db.close();
});

test("sessions enforce status check, unique share_code, and payments jsonb round-trip", async () => {
  const db = await freshDb();
  const uid = "11111111-1111-1111-1111-111111111111";
  const gid = "22222222-2222-2222-2222-222222222222";
  await db.exec(
    `insert into auth.users (id, email, raw_user_meta_data) values ('${uid}', 'a@b.c', '{}'::jsonb);
     insert into public.profiles (id, auth_id, name) values ('${gid}', null, 'Tamu');

     insert into public.sessions (
       id, creator_id, name, date, share_code, player_ids,
       courts, shuttlecocks, additional_costs, payments
     ) values (
       '33333333-3333-3333-3333-333333333333', '${uid}', 'Sesi Jumat', '2026-10-02', '8FK29',
       array['${uid}','${gid}']::uuid[],
       '[{"id":"c1","name":"Court 1","price":120000,"playerIds":["${uid}","${gid}"]}]'::jsonb,
       '[{"id":"k1","name":"Kok A","packPrice":111000,"packSize":12,"used":12,"playerIds":["${uid}"]}]'::jsonb,
       '[{"id":"a1","name":"Parkir","category":"Parkir","amount":10000}]'::jsonb,
       '{"${uid}":"paid","${gid}":"pending"}'::jsonb
     );`,
  );

  const s = await db.query<{
    courts: { price: number; playerIds: string[] }[];
    shuttlecocks: { packPrice: number; packSize: number; used: number }[];
    payments: Record<string, string>;
    player_ids: string[];
  }>("select courts, shuttlecocks, payments, player_ids from public.sessions");
  assert.equal(s.rows[0].courts[0].price, 120000);
  assert.deepEqual(s.rows[0].courts[0].playerIds, [uid, gid]);
  assert.equal(s.rows[0].shuttlecocks[0].packPrice, 111000);
  assert.equal(s.rows[0].shuttlecocks[0].packSize, 12);
  assert.equal(s.rows[0].shuttlecocks[0].used, 12);
  assert.equal(s.rows[0].payments[gid], "pending");
  assert.deepEqual(s.rows[0].player_ids, [uid, gid]);

  // share_code unik.
  await assert.rejects(
    db.exec(
      `insert into public.sessions (creator_id, name, date, share_code)
       values ('${uid}', 'Duplikat', '2026-10-03', '8FK29')`,
    ),
  );

  // status dibatasi check constraint.
  await assert.rejects(
    db.exec(
      `insert into public.sessions (creator_id, name, date, share_code, status)
       values ('${uid}', 'Batal', '2026-10-03', 'AB234', 'batal')`,
    ),
  );

  await db.close();
});

test("touch_updated_at bumps updated_at on update", async () => {
  const db = await freshDb();
  const uid = "11111111-1111-1111-1111-111111111111";
  await db.exec(
    `insert into auth.users (id, email, raw_user_meta_data) values ('${uid}', 'a@b.c', '{}'::jsonb);`,
  );
  const before = await db.query<{ updated_at: string }>(
    "select updated_at from public.profiles",
  );
  await db.exec(`update public.profiles set name = 'Ayub Baru' where id = '${uid}'`);
  const after = await db.query<{ updated_at: string; name: string }>(
    "select updated_at, name from public.profiles",
  );
  assert.equal(after.rows[0].name, "Ayub Baru");
  assert.notEqual(after.rows[0].updated_at, before.rows[0].updated_at);
  await db.close();
});

/** Beri hak tabel ke role `authenticated` lalu jalankan query sebagai user itu. */
async function asUser(db: PGlite, uid: string | null) {
  await db.exec(`
    grant usage on schema public to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);
  `);
}

async function asSuperuser(db: PGlite) {
  await db.exec("reset role");
}

/** Jalankan query sebagai role `anon` (tanpa JWT) — seperti pengunjung /s/<code>. */
async function asAnon(db: PGlite) {
  await db.exec(`
    grant usage on schema public to anon;
    grant select on all tables in schema public to anon;
    set role anon;
    select set_config('request.jwt.claim.sub', '', false);
  `);
}

const UID_A = "11111111-1111-1111-1111-111111111111";
const UID_B = "44444444-4444-4444-4444-444444444444";

async function seedTwoUsers(db: PGlite) {
  await db.exec(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ('${UID_A}', 'a@x.com', '{"name":"Ana"}'::jsonb),
       ('${UID_B}', 'b@x.com', '{"name":"Budi"}'::jsonb);
     insert into public.sessions (creator_id, name, date, share_code, player_ids)
     values ('${UID_A}', 'Sesi Ana', '2026-10-02', 'AAAAA', array['${UID_A}']::uuid[]);`,
  );
}

test("RLS: a signed-in user only reads their own profile row", async () => {
  const db = await freshDb();
  await seedTwoUsers(db);
  await asUser(db, UID_B);
  const r = await db.query<{ id: string; name: string }>(
    "select id, name from public.profiles",
  );
  assert.deepEqual(r.rows, [{ id: UID_B, name: "Budi" }]);
  await db.close();
});

test("RLS: anon cannot read any profile row", async () => {
  const db = await freshDb();
  await seedTwoUsers(db);
  await asAnon(db);
  const r = await db.query<{ id: string }>("select * from public.profiles");
  assert.equal(r.rows.length, 0);
  await db.close();
});

test("RLS: guest profile insert allowed, but impersonating another auth_id is not", async () => {
  const db = await freshDb();
  await seedTwoUsers(db);
  await asUser(db, UID_B);

  await db.exec(
    `insert into public.profiles (id, auth_id, name)
     values ('55555555-5555-5555-5555-555555555555', null, 'Tamu')`,
  );

  await assert.rejects(
    db.exec(
      `insert into public.profiles (id, auth_id, name)
       values ('66666666-6666-6666-6666-666666666666', '${UID_A}', 'Palsu')`,
    ),
    /row-level security|violates row-level/i,
  );
  await db.close();
});

/**
 * INSERT ... RETURNING juga tunduk pada policy SELECT. Kode yang memakai
 * `insert(...).select(...)` dari client user-scoped karena itu TIDAK boleh
 * menargetkan baris yang tidak terlihat policy: PostgREST membalas
 * "new row violates row-level security policy" (42501) dan — inilah bagian
 * berbahayanya — transaksinya rollback, jadi tamunya tidak pernah dibuat.
 * Dua tes di bawah mengunci kontrak itu.
 */
test("RLS: returning a guest profile row from an authenticated insert is denied and rolled back", async () => {
  const db = await freshDb();
  await seedTwoUsers(db);
  await asUser(db, UID_B);
  await assert.rejects(
    db.query(
      `insert into public.profiles (id, auth_id, name)
       values ('55555555-5555-5555-5555-555555555555', null, 'Tamu')
       returning id, name`,
    ),
    /row-level security|violates row-level/i,
  );
  await asSuperuser(db);
  const r = await db.query<{ name: string }>(
    "select name from public.profiles where auth_id is null",
  );
  assert.deepEqual(r.rows, []);
  await db.close();
});

test("RLS: a creator can return their own new session row", async () => {
  const db = await freshDb();
  await seedTwoUsers(db);
  await asUser(db, UID_A);
  const r = await db.query<{ id: string; name: string }>(
    `insert into public.sessions (creator_id, name, date, share_code)
     values ('${UID_A}', 'Sesi Baru', '2026-10-05', 'BBBBB')
     returning id, name`,
  );
  assert.deepEqual(r.rows, [{ id: r.rows[0].id, name: "Sesi Baru" }]);
  await db.close();
});

test("RLS: a user cannot rename another user's profile", async () => {
  const db = await freshDb();
  await seedTwoUsers(db);
  await asUser(db, UID_B);
  await db.exec(`update public.profiles set name = 'Dibajak' where id = '${UID_A}'`);
  await asSuperuser(db);
  const r = await db.query<{ name: string }>(
    `select name from public.profiles where id = '${UID_A}'`,
  );
  assert.equal(r.rows[0].name, "Ana");
  await db.close();
});

test("RLS: sessions are visible only to creator and members", async () => {
  const db = await freshDb();
  await seedTwoUsers(db);

  await asUser(db, UID_B);
  const hidden = await db.query<{ id: string }>("select id from public.sessions");
  assert.equal(hidden.rows.length, 0);
  await db.exec(`update public.sessions set name = 'Dibajak'`);
  await asSuperuser(db);
  const still = await db.query<{ name: string }>("select name from public.sessions");
  assert.equal(still.rows[0].name, "Sesi Ana");

  await asUser(db, UID_A);
  const own = await db.query<{ name: string }>("select name from public.sessions");
  assert.equal(own.rows.length, 1);
  await db.close();
});

test("RLS: a user cannot create a session owned by someone else", async () => {
  const db = await freshDb();
  await seedTwoUsers(db);
  await asUser(db, UID_B);
  await assert.rejects(
    db.exec(
      `insert into public.sessions (creator_id, name, date, share_code)
       values ('${UID_A}', 'Bukan hakku', '2026-10-04', 'ZZZZZ')`,
    ),
    /row-level security|violates row-level/i,
  );
  await db.close();
});

test("RLS: only the creator may delete a session", async () => {
  const db = await freshDb();
  await seedTwoUsers(db);

  // Non-kreator: RLS tidak melempar error, tapi 0 baris terhapus.
  await asUser(db, UID_B);
  const denied = await db.query<{ id: string }>(
    "delete from public.sessions returning id",
  );
  assert.equal(denied.rows.length, 0);
  await asSuperuser(db);
  const still = await db.query<{ id: string }>("select id from public.sessions");
  assert.equal(still.rows.length, 1);

  await asUser(db, UID_A);
  const allowed = await db.query<{ id: string }>(
    "delete from public.sessions returning id",
  );
  assert.equal(allowed.rows.length, 1);
  await asSuperuser(db);
  const gone = await db.query<{ id: string }>("select id from public.sessions");
  assert.equal(gone.rows.length, 0);
  await db.close();
});

/**
 * Project live sudah pernah menjalankan versi file ini yang MEMBUAT kolom
 * `profiles.email` + policy `profiles_select_public`. Migrasi harus tetap
 * idempoten di sana: kolom dibuang, policy lama dihapus. Tanpa tes ini,
 * `create table if not exists` membuat file tampak sukses padahal pembocoran
 * email masih hidup di project yang sudah ter-provision.
 */
test("migration upgrades a database that still has the leaked email column", async () => {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(`
    create table public.profiles (
      id uuid primary key,
      auth_id uuid unique references auth.users (id) on delete cascade,
      name text not null,
      email text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    alter table public.profiles enable row level security;
    create policy "profiles_select_public"
      on public.profiles for select to authenticated using (true);
  `);
  await db.exec(
    `insert into auth.users (id, email, raw_user_meta_data)
     values ('${UID_A}', 'ana@example.com', '{}'::jsonb)`,
  );
  await db.exec(
    `insert into public.profiles (id, auth_id, name, email)
     values ('${UID_A}', '${UID_A}', 'Ana', 'ana@example.com')`,
  );

  await db.exec(MIGRATION);

  const cols = await db.query<{ column_name: string }>(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'`,
  );
  assert.ok(!cols.rows.some((c) => c.column_name === "email"));

  const policies = await db.query<{ policyname: string }>(
    "select policyname from pg_policies where tablename = 'profiles'",
  );
  assert.ok(!policies.rows.some((p) => p.policyname === "profiles_select_public"));
  assert.ok(policies.rows.some((p) => p.policyname === "profiles_select_own"));

  // Baris lama hasil trigger versi LAMA (yang menulis email) harus ikut bersih:
  // kolomnya hilang, jadi tidak ada sisa nilai email di mana pun.
  const leftover = await db.query<Record<string, unknown>>(
    "select * from public.profiles where id = $1",
    [UID_A],
  );
  assert.deepEqual(leftover.rows, [
    {
      id: UID_A,
      auth_id: UID_A,
      name: "Ana",
      created_at: leftover.rows[0].created_at,
      updated_at: leftover.rows[0].updated_at,
    },
  ]);

  // Dan trigger baru tidak menulis email untuk user yang dibuat SETELAH migrasi.
  await db.exec(
    `insert into auth.users (id, email, raw_user_meta_data)
     values ('${UID_B}', 'budi@example.com', '{"name":"Budi"}'::jsonb)`,
  );
  const freshRow = await db.query<Record<string, unknown>>(
    "select * from public.profiles where id = $1",
    [UID_B],
  );
  assert.deepEqual(freshRow.rows, [
    {
      id: UID_B,
      auth_id: UID_B,
      name: "Budi",
      created_at: freshRow.rows[0].created_at,
      updated_at: freshRow.rows[0].updated_at,
    },
  ]);

  await asAnon(db);
  const anon = await db.query<{ id: string }>("select * from public.profiles");
  assert.equal(anon.rows.length, 0);
  await db.close();
});
