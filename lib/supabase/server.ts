import { createClient } from "@supabase/supabase-js";

function getEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`${names.join(" or ")} is not configured`);
}

export function createSupabaseServerClient() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
