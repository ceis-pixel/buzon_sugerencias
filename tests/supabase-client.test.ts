import { createClient as createSupabaseClient, type QueryData, type SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, expect, expectTypeOf, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/client";
import type { supabaseAdmin } from "@/lib/supabase/admin";
import type { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

it("initializes the real browser SDK and validates missing configuration", () => {
  expect(createClient().from("suggestions")).toBeDefined();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
  expect(createClient).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
});

it("preserves the Database generic across every centralized client", () => {
  expectTypeOf<ReturnType<typeof createClient>>().toEqualTypeOf<SupabaseClient<Database>>();
  expectTypeOf<Awaited<ReturnType<typeof createServerClient>>>().toEqualTypeOf<SupabaseClient<Database>>();
  expectTypeOf<typeof supabaseAdmin>().toEqualTypeOf<SupabaseClient<Database>>();
});

it("infers selected rows and rejects invalid table names and mutation payloads", () => {
  const client = createSupabaseClient<Database>("http://127.0.0.1:54321", "test-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  // Query builders are never awaited, so this type check makes no network calls.
  const query = client.from("suggestions").select("id, status");
  expectTypeOf(query).not.toBeAny();
  expectTypeOf<QueryData<typeof query>>().toEqualTypeOf<
    Array<Pick<Database["public"]["Tables"]["suggestions"]["Row"], "id" | "status">>
  >();

  const responses = client.from("ticket_responses").select("response_text, is_internal, admins(full_name)");
  expectTypeOf(responses).not.toBeAny();
  expectTypeOf<QueryData<typeof responses>>().toEqualTypeOf<
    Array<{ response_text: string; is_internal: boolean; admins: { full_name: string } }>
  >();

  client.from("suggestions").insert({
    message: "Mejorar la atención.",
    shift: "lunch",
    category: "service",
  });
  client.from("suggestions").update({ status: "in_review" });
  // @ts-expect-error Unknown tables must not be accepted.
  client.from("unknown_table");
  // @ts-expect-error Required message, shift, and category must not be omitted.
  client.from("suggestions").insert({});
  // @ts-expect-error Status must belong to the approved enum.
  client.from("suggestions").update({ status: "closed" });
  // @ts-expect-error Response ownership and content must be supplied.
  client.from("ticket_responses").insert({ response_text: "Gracias por tu sugerencia." });

  const adminQuery = client.from("admins").select("id, email, is_active");
  expectTypeOf(adminQuery).not.toBeAny();
  expectTypeOf<QueryData<typeof adminQuery>>().toEqualTypeOf<
    Array<Pick<Database["public"]["Tables"]["admins"]["Row"], "id" | "email" | "is_active">>
  >();

  const isAdminRpc = client.rpc("is_admin");
  expectTypeOf(isAdminRpc).not.toBeAny();

  const codeRpc = client.rpc("generate_unique_ticket_code");
  expectTypeOf(codeRpc).not.toBeAny();
  // @ts-expect-error Unknown RPC functions must not be accepted.
  client.rpc("unknown_function");
});
