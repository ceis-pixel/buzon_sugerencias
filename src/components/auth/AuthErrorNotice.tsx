"use client";

import { AlertCircle, ShieldAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { getAuthErrorMessage } from "@/lib/auth/authActions";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (!error) {
    return null;
  }

  if (error === "domain_not_allowed") {
    return (
      <AlertBanner
        variant="error"
        title="Acceso restringido"
        description="Debes seleccionar una cuenta con terminación @unsch.edu.pe para acceder al buzón."
        icon={ShieldAlert}
      />
    );
  }

  if (error === "oauth_callback_error") {
    return (
      <AlertBanner
        variant="warning"
        title="Error de autenticación"
        description="No se pudo completar el inicio de sesión con Google. Por favor, vuelve a intentarlo."
        icon={AlertCircle}
      />
    );
  }

  if (error === "session_missing") {
    return (
      <AlertBanner
        variant="warning"
        title="Código de autorización ausente"
        description="La solicitud no contiene un código de sesión válido. Inicia sesión nuevamente."
        icon={AlertCircle}
      />
    );
  }

  const fallback = getAuthErrorMessage(error);
  return (
    <AlertBanner
      variant="warning"
      title={fallback.title}
      description={fallback.message}
      icon={AlertCircle}
    />
  );
}

export function AuthErrorNotice() {
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  );
}
