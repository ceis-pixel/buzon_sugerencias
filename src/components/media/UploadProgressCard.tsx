"use client";

import { AlertTriangle, Loader2, RotateCcw, Trash2, X } from "lucide-react";

import { Button } from "@/components/common/Button";

export interface UploadProgressCardProps {
  progress: number;
  status: "uploading" | "retrying" | "error" | "success";
  errorMessage?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
  onDiscard?: () => void;
  fileName?: string;
  className?: string;
}

export function UploadProgressCard({
  progress,
  status,
  errorMessage,
  onRetry,
  onCancel,
  onDiscard,
  fileName,
  className = "",
}: UploadProgressCardProps) {
  const isError = status === "error";
  const isRetrying = status === "retrying";

  return (
    <div
      role="region"
      aria-label="Estado de subida de evidencia fotográfica"
      className={[
        "relative rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 sm:p-5",
        isError ? "border-amber-200 bg-amber-50/30" : "border-gray-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* 1. Header with dynamic label & quick cancel action */}
      <div className="flex items-center justify-between gap-3 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          {isError ? (
            <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
          ) : (
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
          )}

          <p className="truncate text-xs font-semibold sm:text-sm text-gray-900">
            {isError
              ? "Interrupción en la subida"
              : isRetrying
              ? "Reintentando transferencia..."
              : "Cargando evidencia..."}
          </p>

          {fileName && (
            <span className="hidden truncate text-xs text-neutral-gray sm:inline">
              ({fileName})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!isError && (
            <span
              className="font-mono text-xs font-bold text-primary"
              aria-live="polite"
            >
              {progress}%
            </span>
          )}

          {!isError && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancelar subida"
              className="flex size-8 min-h-8 min-w-8 items-center justify-center rounded-lg text-neutral-gray transition-colors hover:bg-neutral-gray/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Accessible Progress Bar */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={isError ? 100 : progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Barra de avance de la subida"
      >
        <div
          className={[
            "h-full transition-all duration-300 ease-out",
            isError ? "bg-amber-500" : "bg-primary",
          ].join(" ")}
          style={{ width: `${isError ? 100 : progress}%` }}
        />
      </div>

      {/* 3. Instructive messaging or error state */}
      {!isError ? (
        <p className="pt-2 text-xs text-neutral-gray">
          La imagen optimizada se está enviando a nuestro almacenamiento seguro. Por favor espera un momento.
        </p>
      ) : (
        <div className="space-y-3 pt-2 animate-fade-in">
          <p className="text-xs leading-5 text-amber-900">
            {errorMessage ||
              "La señal móvil es inestable. No pudimos completar la subida de la imagen."}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {onRetry && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<RotateCcw className="size-3.5" />}
                onClick={onRetry}
              >
                Reintentar ahora
              </Button>
            )}

            {onDiscard && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="size-3.5 text-primary" />}
                onClick={onDiscard}
                className="border border-primary/20 text-primary hover:bg-primary/10"
              >
                Descartar foto
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
