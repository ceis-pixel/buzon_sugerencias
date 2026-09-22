"use client";

import { LogIn, ShieldAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { Button } from "@/components/common/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/Card";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAuthErrorMessage, signInWithInstitutionalGoogle } from "@/lib/auth/authActions";

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const errorDetails = errorParam ? getAuthErrorMessage(errorParam) : null;

  async function handleGoogleLogin() {
    try {
      setIsLoading(true);
      setAuthError(null);
      const next = searchParams.get("next") ?? "/";
      const { error } = await signInWithInstitutionalGoogle(next);
      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
      }
    } catch {
      setAuthError("No se pudo conectar con el servicio de autenticación.");
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      {errorDetails && (
        <AlertBanner
          variant={errorDetails.code === "domain_not_allowed" ? "error" : "warning"}
          title={errorDetails.title}
          description={errorDetails.message}
          icon={ShieldAlert}
        />
      )}

      {authError && (
        <AlertBanner
          variant="error"
          title="Error de conexión"
          description={authError}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Acceso Estudiantil</CardTitle>
          <CardDescription>
            Usa tu cuenta universitaria @unsch.edu.pe para acceder al buzón de sugerencias del comedor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            fullWidth
            size="lg"
            variant="primary"
            leftIcon={<LogIn />}
            isLoading={isLoading}
            onClick={handleGoogleLogin}
          >
            Iniciar sesión con Google (@unsch.edu.pe)
          </Button>

          <p className="text-center text-xs text-gray-500">
            Tu identidad se mantendrá completamente disociada al registrar sugerencias públicas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <PageContainer
      title="Acceso al Comedor UNSCH"
      subtitle="Autenticación institucional rápida y segura para la comunidad universitaria."
      badge="Sprint 4 · Autenticación"
    >
      <Suspense fallback={<div className="text-center py-12 text-sm text-gray-500">Cargando formulario...</div>}>
        <LoginForm />
      </Suspense>
    </PageContainer>
  );
}
