"use client";

import { LogIn, Sparkles } from "lucide-react";
import { useState } from "react";

import { PrivacyNotice } from "@/components/auth/PrivacyNotice";
import { AlertBanner } from "@/components/common/AlertBanner";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { signInWithInstitutionalGoogle } from "@/lib/auth/authActions";

export interface LoginCardProps {
  redirectTo?: string;
  className?: string;
}

export function LoginCard({ redirectTo = "/", className = "" }: LoginCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  async function handleSignIn() {
    try {
      setIsLoading(true);
      setInternalError(null);
      const { error } = await signInWithInstitutionalGoogle(redirectTo);
      if (error) {
        setInternalError(error.message);
        setIsLoading(false);
      }
    } catch (err) {
      setInternalError(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con el servicio de autenticación institucional.",
      );
      setIsLoading(false);
    }
  }

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader className="flex flex-col items-center space-y-2 text-center pb-3">
        <Badge variant="secondary" icon={<Sparkles />}>
          Comedor Universitario · FUSCH
        </Badge>
        <CardTitle as="h2" className="text-2xl font-bold text-gray-900">
          Acceso al Buzón
        </CardTitle>
        <CardDescription className="text-sm leading-6">
          Comedor Universitario UNSCH — FUSCH
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {internalError && (
          <AlertBanner
            variant="error"
            title="Error de inicio de sesión"
            description={internalError}
          />
        )}

        <div className="space-y-2">
          <Button
            fullWidth
            size="lg"
            variant="primary"
            leftIcon={<LogIn />}
            isLoading={isLoading}
            onClick={handleSignIn}
          >
            Continuar con correo institucional (@unsch.edu.pe)
          </Button>
          <p className="text-center font-sans text-xs text-neutral-gray">
            Acceso seguro mediante Google Workspace institucional.
          </p>
        </div>

        <PrivacyNotice />
      </CardContent>
    </Card>
  );
}
