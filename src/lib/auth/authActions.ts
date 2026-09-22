import { createClient } from "@/lib/supabase/client";
import type { AuthErrorCode, AuthErrorDetails } from "@/types/auth.types";

/**
 * Initiates the Google OAuth sign-in flow restricted to institutional @unsch.edu.pe accounts.
 *
 * @param redirectTo - Path to redirect to after successful authentication (defaults to "/")
 */
export async function signInWithInstitutionalGoogle(redirectTo: string = "/") {
  const supabase = createClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const callbackUrl = new URL("/auth/callback", origin || "http://localhost:3000");

  if (redirectTo && redirectTo !== "/") {
    callbackUrl.searchParams.set("next", redirectTo);
  }

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        hd: "unsch.edu.pe",
        prompt: "select_account",
      },
    },
  });
}

/**
 * Signs out the current user, clearing session cookies and local storage state.
 */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Maps authentication error codes to localized, user-friendly messages.
 */
export function getAuthErrorMessage(
  code: AuthErrorCode | string | null | undefined,
): AuthErrorDetails {
  switch (code) {
    case "domain_not_allowed":
      return {
        code: "domain_not_allowed",
        title: "Acceso exclusivo institucional",
        message:
          "Solo se permite ingresar con correos institucionales @unsch.edu.pe. Por favor, selecciona tu cuenta universitaria de la UNSCH.",
      };
    case "oauth_callback_error":
      return {
        code: "oauth_callback_error",
        title: "Error de autenticación",
        message:
          "No se pudo completar el inicio de sesión con Google. Por favor, vuelve a intentarlo.",
      };
    case "session_missing":
      return {
        code: "session_missing",
        title: "Código de autorización ausente",
        message:
          "La solicitud no contiene un código de sesión válido. Inicia sesión nuevamente.",
      };
    default:
      return {
        code: "unknown_error",
        title: "Error al iniciar sesión",
        message:
          "Ocurrió un problema inesperado durante el acceso. Si el problema persiste, contacta al administrador.",
      };
  }
}
