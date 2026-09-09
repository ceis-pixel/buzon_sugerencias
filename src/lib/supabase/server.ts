import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

// Route Handlers should pass the Headers used by their outgoing response.
export async function createClient(responseHeaders?: Headers) {
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.startsWith(
              "Cookies can only be modified in a Server Action or Route Handler.",
            )
          ) {
            // Server Components are read-only. A Proxy must refresh sessions
            // before rendering protected content; Actions and handlers can write.
            return;
          }

          throw error;
        }

        Object.entries(headersToSet).forEach(([name, value]) => {
          responseHeaders?.set(name, value);
        });
      },
    },
  });
}
