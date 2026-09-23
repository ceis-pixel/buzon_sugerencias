"use client";

import { AlertTriangle, LogOut } from "lucide-react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { useLogout } from "@/lib/hooks/useLogout";

export interface LogoutModalProps {
  /** Controls the modal visibility. */
  isOpen: boolean;
  /** Called when the user dismisses the modal without logging out. */
  onClose: () => void;
}

/**
 * Secure logout confirmation dialog conforming to Section 4.5 of the
 * Crimson Heritage Design System.
 *
 * - Composes the shared Modal, AlertBanner and Button primitives from Sprint 2.
 * - Displays an explicit shared-device security warning.
 * - Delegates the actual sign-out sequence to the useLogout hook.
 */
export function LogoutModal({ isOpen, onClose }: LogoutModalProps) {
  const { isLoggingOut, logoutError, handleLogout } = useLogout();

  async function handleConfirm() {
    await handleLogout();
    // onClose is intentionally NOT called here; the hook redirects to /login,
    // unmounting this component naturally. Calling onClose first could cause
    // a state-update-on-unmounted-component warning.
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoggingOut ? () => {} : onClose}
      showCloseButton={!isLoggingOut}
      size="sm"
      title="¿Cerrar sesión institucional?"
      description="Estás a punto de salir de tu cuenta universitaria UNSCH."
      footer={
        <>
          <Button
            id="logout-modal-cancel"
            variant="ghost"
            disabled={isLoggingOut}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            id="logout-modal-confirm"
            variant="primary"
            isLoading={isLoggingOut}
            leftIcon={<LogOut />}
            onClick={handleConfirm}
          >
            {isLoggingOut ? "Cerrando sesión…" : "Cerrar Sesión"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-6 text-neutral-gray">
          Al cerrar tu sesión se eliminará el acceso activo desde este dispositivo y no
          podrás enviar sugerencias hasta que vuelvas a iniciar sesión con tu correo
          institucional{" "}
          <span className="font-semibold text-primary">@unsch.edu.pe</span>.
        </p>

        <AlertBanner
          variant="warning"
          icon={AlertTriangle}
          title="Aviso de seguridad para equipos del campus"
          description={
            <>
              Si estás utilizando una{" "}
              <strong>computadora compartida</strong> (Biblioteca Central, laboratorios o
              cabinas de cómputo del campus), recuerda{" "}
              <strong>cerrar completamente la ventana del navegador</strong> al salir para
              evitar que otra persona acceda a tu cuenta institucional y a las cookies
              residuales de Google OAuth.
            </>
          }
        />

        {logoutError && (
          <AlertBanner
            variant="error"
            description={logoutError}
          />
        )}
      </div>
    </Modal>
  );
}
