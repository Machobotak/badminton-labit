import {
  BadRequest,
  err,
  myProfile,
  readBody,
  reqStr,
  requireUser,
  serverError,
} from "@/lib/server-helpers";
import { rowToUser, type MyProfile } from "@/lib/db";

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return err("Belum login", 401);
    const profile = await myProfile(supabase, user);
    return Response.json({ user: rowToUser(profile) });
  } catch (e) {
    if (e instanceof BadRequest) return err(e.message);
    return serverError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return err("Belum login", 401);
    const body = await readBody(request);
    const name = reqStr(body, "name", 100);
    const profile = await myProfile(supabase, user);
    // `profiles` tidak menyimpan email; setelah update, email tetap diambil
    // dari `auth.users` supaya respon `/api/me` tidak berubah bentuk.
    const { data, error } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", profile.id)
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Gagal menyimpan nama");
    const row: Omit<MyProfile, "email"> = data;
    return Response.json({ user: rowToUser({ ...row, email: user.email ?? null }) });
  } catch (e) {
    if (e instanceof BadRequest) return err(e.message);
    return serverError(e);
  }
}
