import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrl, requireEnvironmentVariable } from "@/lib/env";
import type { Database } from "@/types/database.types";

if (typeof window !== "undefined") {
  throw new Error(
    "El cliente administrativo de Supabase solo puede ejecutarse en el servidor.",
  );
}

// Keep the privileged key in this server-only module, separate from public env.
export const supabaseAdmin = createClient<Database>(
  getSupabaseUrl(),
  requireEnvironmentVariable(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
