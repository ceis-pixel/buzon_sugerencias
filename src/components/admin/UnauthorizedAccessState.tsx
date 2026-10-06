"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LogOut, ShieldAlert } from "lucide-react";

import { Button } from "@/components/common/Button";
import { Card, CardContent } from "@/components/common/Card";
import { LogoutModal } from "@/components/auth/LogoutModal";

export interface UnauthorizedAccessStateProps {
  userEmail: string;
}

/**
 * Issue 8.1 — UnauthorizedAccessState
 *
 * Rendered when an authenticated student or staff member attempts to navigate
 * to `/admin` without being registered as an active moderator in the `admins` whitelist.
 *
 * Conforms to Section 4.5 of the Crimson Heritage Design System:
 * - Didactic 403 state with ShieldAlert icon.
 * - Primary button to return safely to the home view.
 * - Optional logout trigger to allow signing into another institutional account.
 */
export function UnauthorizedAccessState({ userEmail }: UnauthorizedAccessStateProps) {
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg border border-primary/20 bg-white p-6 shadow-sm sm:p-8">
        <CardContent className="flex flex-col items-center text-center space-y-6">
          {/* Security Shield Icon */}
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <ShieldAlert className="h-9 w-9 stroke-[2.2]" />
          </div>

          {/* Heading and didactic message */}
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              Código 403 • Acceso Restringido
            </span>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Acceso restringido a la Junta de Vigilancia
            </h1>
            <p className="text-sm leading-relaxed text-neutral-gray">
              El panel de administración y moderación está reservado exclusivamente para
              los miembros de la{" "}
              <strong className="text-gray-800">
                Junta de Vigilancia del Comedor Universitario (JVC)
              </strong>{" "}
              y los moderadores institucionales autorizados.
            </p>
          </div>

          {/* User Email Box */}
          <div className="w-full rounded-xl border border-neutral-gray/20 bg-slate-50 px-4 py-3 text-left">
            <span className="block text-xs font-medium text-neutral-gray">
              Cuenta institucional conectada:
            </span>
            <span className="block truncate font-mono text-sm font-semibold text-primary">
              {userEmail}
            </span>
            <p className="mt-1 text-xs text-neutral-gray/80">
              Este correo no figura en el padrón de moderadores activos del sistema.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              as="a"
              href="/"
              variant="primary"
              fullWidth
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Volver al Inicio
            </Button>
            <Button
              variant="secondary"
              fullWidth
              leftIcon={<LogOut className="h-4 w-4" />}
              onClick={() => setIsLogoutOpen(true)}
            >
              Cambiar Cuenta
            </Button>
          </div>

          {/* Public tracking redirect hint */}
          <p className="text-xs text-neutral-gray">
            ¿Deseas consultar el estado de tu ticket anónimo?{" "}
            <Link
              href="/seguimiento"
              className="font-semibold text-primary underline hover:text-primary/80"
            >
              Ir a Seguimiento de Tickets
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Logout confirmation modal */}
      <LogoutModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
      />
    </div>
  );
}
