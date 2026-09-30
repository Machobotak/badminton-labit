/**
 * Dilempar bila env Supabase belum diisi. Dibedakan dari error runtime lain
 * agar API bisa menjawab 503 + pesan setup, bukan 500 generik.
 */
export class ConfigError extends Error {}

export function missingEnv(keys: string[]): ConfigError {
  return new ConfigError(
    `Supabase belum dikonfigurasi (${keys.join(", ")}). Salin .env.example ke ` +
      `.env.local lalu isi nilainya, lalu restart server.`,
  );
}
