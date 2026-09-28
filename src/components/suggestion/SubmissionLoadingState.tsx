"use client";

import { Loader2, Wifi } from "lucide-react";

export type SubmissionStage =
  | "idle"
  | "uploading_media"
  | "submitting_rpc"
  | "slow_network";

export interface SubmissionLoadingStateProps {
  stage: SubmissionStage;
  className?: string;
}

export function getSubmissionStageMessage(stage: SubmissionStage): string {
  switch (stage) {
    case "uploading_media":
      return "Subiendo evidencia fotográfica...";
    case "submitting_rpc":
      return "Generando ticket anónimo...";
    case "slow_network":
      return "Casi listo, asegurando tu reporte...";
    case "idle":
    default:
      return "Enviando tu sugerencia...";
  }
}

export function SubmissionLoadingState({
  stage,
  className = "",
}: SubmissionLoadingStateProps) {
  if (stage === "idle") return null;

  const message = getSubmissionStageMessage(stage);
  const isSlow = stage === "slow_network";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={[
        "flex items-center gap-3 rounded-xl border p-3.5 text-xs sm:text-sm font-medium transition-all duration-200",
        isSlow
          ? "border-amber-200 bg-amber-50/80 text-amber-900"
          : "border-primary/20 bg-primary/5 text-primary",
        className,
      ].join(" ")}
    >
      <Loader2
        className={`size-4 sm:size-5 shrink-0 animate-spin ${
          isSlow ? "text-amber-700" : "text-primary"
        }`}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-bold leading-tight">{message}</p>
        <p className={isSlow ? "text-amber-800/80 text-xs" : "text-neutral-gray text-xs"}>
          {isSlow
            ? "La conexión móvil del comedor está tardando más de lo habitual. Por favor, no cierres esta ventana."
            : "Guardando tu observación en reserva para el comedor..."}
        </p>
      </div>

      {isSlow && (
        <Wifi
          className="size-4 shrink-0 text-amber-600 animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
