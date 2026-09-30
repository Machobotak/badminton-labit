import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { missingEnv } from "./config";

/**
 * Client Supabase untuk API routes / Server Components.
 * Selalu buat baru per request — jangan dishare antar request.
 * `cookies()` async (Next 16) + adapter getAll/setAll (@supabase/ssr non-deprecated).
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon)
    throw missingEnv([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Dipanggil dari Server Component: tulis cookie diabaikan,
          // proxy.ts yang menangani refresh session.
        }
      },
    },
  });
}
