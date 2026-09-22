"use client";

import { LogIn, Sparkles } from "lucide-react";
import { useState } from "react";

import { InstitutionalFeedbackBox } from "@/components/auth/InstitutionalFeedbackBox";
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
import { Input } from "@/components/common/Input";
import { signInWithInstitutionalGoogle } from "@/lib/auth/authActions";
import { useInstitutionalEmail } from "@/lib/hooks/useInstitutionalEmail";

export interface LoginCardProps {
  redirectTo?: string;
  className?: string;
}

export function LoginCard({ redirectTo = "/", className = "" }: LoginCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const {
    email,
    setEmail,
    isValidDomain,
    isDomainError,
    handleBlur,
  } = useInstitutionalEmail();

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

  // Button is blocked if a non-institutional domain was entered
  const isSubmitDisabled = isDomainError || (email.length > 0 && !isValidDomain);

  const borderClass = isDomainError
    ? "!border-primary focus-visible:!ring-primary/40 focus:!border-primary"
    : isValidDomain
      ? "!border-emerald-600 focus-visible:!ring-emerald-500/30"
      : "";

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

        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              id="student-email"
              type="email"
              label="Correo institucional (@unsch.edu.pe)"
              placeholder="ejemplo: 28190012@unsch.edu.pe"
              helperText={
                isDomainError
                  ? undefined
                  : "Ingresa tu cuenta para validar tu acceso o continúa directamente abajo."
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleBlur}
              aria-invalid={isDomainError}
              className={`transition-colors duration-200 ${borderClass}`}
            />

            {isDomainError && (
              <div className="pt-1 animate-fade-in">
                <InstitutionalFeedbackBox />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              fullWidth
              size="lg"
              variant="primary"
              leftIcon={<LogIn />}
              isLoading={isLoading}
              disabled={isSubmitDisabled}
              onClick={handleSignIn}
            >
              {isDomainError
                ? "Correo no permitido (@unsch.edu.pe requerido)"
                : "Continuar con correo institucional (@unsch.edu.pe)"}
            </Button>

            <p className="text-center font-sans text-xs text-neutral-gray">
              Acceso seguro restringido mediante Google Workspace institucional.
            </p>
          </div>
        </div>

        <PrivacyNotice />
      </CardContent>
    </Card>
  );
}
