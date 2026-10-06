"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

/**
 * Tells signed-out visitors that sending a suggestion requires the
 * institutional account. Renders nothing while the session is loading or active.
 */
export function SignInPrompt() {
  const { status } = useSession();

  if (status !== "unauthenticated") return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-tertiary/20 bg-tertiary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-6 text-gray-800">
        Para enviar necesitas ingresar con tu correo{" "}
        <span className="font-semibold">@unsch.edu.pe</span>. Solo se usa para
        verificar que eres estudiante: tu sugerencia se guarda sin tu identidad.
      </p>
      <Link
        href="/login"
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        <LogIn aria-hidden="true" className="size-4" />
        Ingresar
      </Link>
    </div>
  );
}
