import { signIn, signOut as nextAuthSignOut } from "next-auth/react";

import type { AuthErrorCode, AuthErrorDetails } from "@/types/auth.types";

/** Only same-site relative paths are accepted as post-login destinations. */
export function toSafeRedirectPath(redirectTo: string | null | undefined): string {
  return redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : "/";
}

/**
 * Initiates the Google Workspace SSO flow restricted to institutional @unsch.edu.pe
 * accounts. The domain is enforced on the server by the NextAuth `signIn` callback.
 *
 * @param redirectTo - Path to redirect to after successful authentication (defaults to "/")
 */
export async function signInWithInstitutionalGoogle(
  redirectTo: string = "/",
): Promise<{ error: { message: string } | null }> {
  const result = await signIn("google", { callbackUrl: toSafeRedirectPath(redirectTo) });

  // On success the browser navigates to Google and this code never resumes.
  if (result?.error) {
    return {
      error: { message: "No se pudo iniciar el acceso con Google. Por favor, vuelve a intentarlo." },
    };
  }

  return { error: null };
}

/**
 * Signs out the current user, clearing the session cookie.
 */
export async function signOut() {
  await nextAuthSignOut({ redirect: false });
}

/**
 * Maps authentication error codes to localized, user-friendly messages.
 */
export function getAuthErrorMessage(
  code: AuthErrorCode | string | null | undefined,
): AuthErrorDetails {
  switch (code) {
    case "domain_not_allowed":
    case "AccessDenied":
      return {
        code: "domain_not_allowed",
        title: "Acceso exclusivo institucional",
        message:
          "Solo se permite ingresar con correos institucionales @unsch.edu.pe. Por favor, selecciona tu cuenta universitaria de la UNSCH.",
      };
    case "oauth_callback_error":
    case "OAuthSignin":
    case "OAuthCallback":
    case "Callback":
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
