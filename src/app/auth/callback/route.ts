import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const oauthError = requestUrl.searchParams.get("error");

  // Handle provider-level error callback
  if (oauthError) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_callback_error", requestUrl.origin),
    );
  }

  // Missing code in authorization callback
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=session_missing", requestUrl.origin),
    );
  }

  const responseHeaders = new Headers();
  const supabase = await createClient(responseHeaders);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session?.user) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_callback_error", requestUrl.origin),
      { headers: responseHeaders },
    );
  }

  const email = data.session.user.email?.toLowerCase();
  const allowedDomain = "@unsch.edu.pe";

  // Strict defensive check: verify user email domain matches @unsch.edu.pe
  if (!email || !email.endsWith(allowedDomain)) {
    // Immediately destroy the unauthorized session
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL("/login?error=domain_not_allowed", requestUrl.origin),
      { headers: responseHeaders },
    );
  }

  // Prevent open redirect vulnerabilities (must be a single-slash relative path)
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin), {
    headers: responseHeaders,
  });
}
