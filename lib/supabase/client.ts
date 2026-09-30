import { createBrowserClient } from "@supabase/ssr";
import { missingEnv } from "./config";

/** Client Supabase untuk Client Components (login/register/logout). */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon)
    throw missingEnv([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
  return createBrowserClient(url, anon);
}
