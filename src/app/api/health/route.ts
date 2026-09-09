import { SupabaseEnvironmentError } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = new Headers({ "Cache-Control": "private, no-store" });

  try {
    // This checks client initialization only; it does not query the database.
    await createClient(headers);

    return Response.json(
      { status: "ok", message: "Cliente de Supabase inicializado correctamente." },
      { headers },
    );
  } catch (error) {
    if (error instanceof SupabaseEnvironmentError) {
      return Response.json(
        { status: "unavailable", message: error.message },
        { status: 503, headers },
      );
    }

    throw error;
  }
}
