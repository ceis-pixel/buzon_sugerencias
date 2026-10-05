"use client";

import { LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/common/Button";
import { signInWithInstitutionalGoogle } from "@/lib/auth/authActions";

export function AuthShowcase() {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleTestSignIn() {
    try {
      setIsLoading(true);
      setStatus("Iniciando flujo OAuth institucional...");
      const { error } = await signInWithInstitutionalGoogle("/");
      if (error) {
        setStatus(`Error al iniciar el acceso institucional: ${error.message}`);
      }
    } catch (err) {
      setStatus(`Excepción: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="auth-showcase-title"
      className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 id="auth-showcase-title" className="text-lg font-semibold text-secondary">
          Autenticación Institucional (@unsch.edu.pe)
        </h2>
      </div>
      <p className="text-sm leading-6 text-gray-600">
        Prueba del flujo de autenticación con Google OAuth restringido mediante hosted domain (
        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-primary font-mono">
          hd=unsch.edu.pe
        </code>
        ).
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          leftIcon={<LogIn />}
          isLoading={isLoading}
          onClick={handleTestSignIn}
        >
          Iniciar sesión con Google (@unsch.edu.pe)
        </Button>

        <Button as="a" href="/login" variant="secondary">
          Ir a pantalla de acceso (/login)
        </Button>
      </div>

      {status && (
        <p
          role="status"
          className="rounded-xl border border-tertiary/20 bg-tertiary/5 p-3 text-xs leading-5 text-tertiary"
        >
          {status}
        </p>
      )}
    </section>
  );
}
