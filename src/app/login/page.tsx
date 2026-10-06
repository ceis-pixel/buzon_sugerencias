"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AuthErrorNotice } from "@/components/auth/AuthErrorNotice";
import { LoginCard } from "@/components/auth/LoginCard";
import { PageContainer } from "@/components/layout/PageContainer";

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? searchParams.get("returnUrl") ?? "/";

  return (
    <div className="flex min-h-[65vh] md:min-h-[72vh] w-full flex-col items-center justify-center space-y-6">
      <div className="w-full max-w-md">
        <AuthErrorNotice />
      </div>

      <LoginCard redirectTo={next} />

      <div className="text-center pt-2">
        <Link
          href="/seguimiento"
          className="font-sans text-xs text-secondary underline underline-offset-4 transition-colors hover:text-primary"
        >
          ¿Solo quieres consultar un ticket previo? Consulta tu estado aquí
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <PageContainer
      title="Acceso al Buzón"
      subtitle="Participa en la mejora continua de nuestro comedor estudiantil."
      badge="Comedor UNSCH · JVC"
    >
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-neutral-gray">
            Cargando acceso institucional...
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </PageContainer>
  );
}
