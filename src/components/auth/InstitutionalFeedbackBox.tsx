import { AlertCircle, ExternalLink } from "lucide-react";
import type { HTMLAttributes } from "react";

export interface InstitutionalFeedbackBoxProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  guideUrl?: string;
}

/**
 * Didactic pedagogical feedback box for non-institutional email error states,
 * following Section 4.1 of the Crimson Heritage Design System.
 */
export function InstitutionalFeedbackBox({
  className = "",
  guideUrl = "https://correo.unsch.edu.pe",
  ...props
}: InstitutionalFeedbackBoxProps) {
  return (
    <div
      {...props}
      role="alert"
      aria-live="polite"
      className={`rounded-xl border border-primary/20 bg-primary/5 p-4 text-left ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-1.5 text-primary shrink-0">
          <AlertCircle className="size-4" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h4 className="font-sans text-xs font-bold text-primary">
            Usa tu correo institucional @unsch.edu.pe
          </h4>
          <p className="font-sans text-xs leading-5 text-neutral-gray">
            Para garantizar que las sugerencias provengan de comensales reales del comedor y
            evitar el uso indebido del buzón, solicitamos validar tu cuenta institucional. Tu
            reporte seguirá siendo 100% anónimo para los administradores.
          </p>
          <div className="pt-1">
            <a
              href={guideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-primary underline underline-offset-4 transition-colors hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded"
            >
              <span>Ver guía de activación de cuenta institucional</span>
              <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
