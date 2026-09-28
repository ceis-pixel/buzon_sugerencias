"use client";

import { AlertTriangle, FileText, ImageOff, RefreshCw, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/common/Button";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UploadFallbackModalProps {
  /** Whether the modal is visible. */
  isOpen: boolean;
  /** Name of the file that failed to upload. */
  fileName?: string;
  /** Number of upload attempts already made. */
  attempts?: number;
  /** Last error message from the upload hook. */
  errorMessage?: string | null;
  /** Called when the student chooses to discard the photo and submit text-only. */
  onDiscardAndContinue: () => void;
  /** Called when the student wants to try uploading again. */
  onRetry: () => void;
  /** Called when the student closes the modal without choosing an action. */
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Degradación elegante ante fallos persistentes de subida de imagen.
 *
 * Shown after ≥2 failed upload attempts (or after a manual trigger).
 * Gives students two clearly labelled paths:
 *   1. Discard photo and continue with text-only suggestion.
 *   2. Try uploading again (one more explicit retry).
 *
 * The modal is a full-screen overlay with a centred card that traps focus
 * and supports Escape to close.
 */
export function UploadFallbackModal({
  isOpen,
  fileName,
  attempts = 1,
  errorMessage,
  onDiscardAndContinue,
  onRetry,
  onClose,
}: UploadFallbackModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  // Focus anchor: a hidden <div tabIndex> that we focus on open to announce the dialog
  const focusAnchorRef = useRef<HTMLDivElement>(null);

  // Focus the dialog container when the modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => focusAnchorRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape key closes the modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Must be defined before any early return to comply with Rules of Hooks
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  const displayAttempts = attempts > 1 ? `${attempts} intentos` : "1 intento";

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fallback-modal-title"
      aria-describedby="fallback-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(4px)" }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden animate-fade-in"
        role="document"
      >
        {/* Hidden focus anchor for a11y */}
        <div ref={focusAnchorRef} tabIndex={-1} className="sr-only" aria-hidden="true" />
        {/* ── Top warning stripe ── */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-4 flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <WifiOff className="size-5 text-amber-600" aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <p
              id="fallback-modal-title"
              className="text-sm font-bold text-gray-900 leading-snug"
            >
              No se pudo subir la foto
            </p>
            <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
              Señal inestable después de {displayAttempts}.
            </p>
          </div>
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar aviso"
            className="shrink-0 flex size-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-5 space-y-4">
          {/* Error detail */}
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3">
              <AlertTriangle
                className="size-4 shrink-0 text-red-500 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-xs text-red-700 leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* File name */}
          {fileName && (
            <div className="flex items-center gap-2 rounded-xl border border-secondary/20 bg-secondary/5 px-3 py-2">
              <ImageOff className="size-4 text-neutral-gray shrink-0" aria-hidden="true" />
              <span className="truncate text-xs font-mono text-neutral-gray">{fileName}</span>
            </div>
          )}

          {/* Explanation */}
          <p
            id="fallback-modal-desc"
            className="text-sm text-gray-600 leading-relaxed"
          >
            Tu sugerencia en texto{" "}
            <strong className="text-gray-900">no se perderá</strong>. Puedes
            enviarla ahora sin foto o intentar subir la imagen nuevamente cuando
            tengas mejor señal.
          </p>

          {/* Reassurance pill */}
          <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-100 px-3 py-2.5">
            <FileText className="size-4 text-green-600 shrink-0" aria-hidden="true" />
            <p className="text-xs text-green-700 leading-relaxed">
              <span className="font-semibold">Tu reclamo tiene prioridad.</span>{" "}
              El equipo del comedor revisará tu mensaje aunque no incluya evidencia visual.
            </p>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="px-5 pb-5 flex flex-col gap-2.5">
          {/* Primary: Discard photo and continue */}
          <Button
            type="button"
            variant="primary"
            size="md"
            leftIcon={<FileText className="size-4" />}
            onClick={onDiscardAndContinue}
            className="w-full justify-center"
          >
            Enviar sugerencia sin foto
          </Button>

          {/* Secondary: Try again */}
          <Button
            type="button"
            variant="ghost"
            size="md"
            leftIcon={<RefreshCw className="size-4" />}
            onClick={onRetry}
            className="w-full justify-center border border-secondary/30 text-primary hover:bg-primary/5"
          >
            Intentar subir imagen nuevamente
          </Button>
        </div>
      </div>
    </div>
  );
}
