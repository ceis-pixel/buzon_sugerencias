import { ShieldCheck } from "lucide-react";
import type { HTMLAttributes } from "react";

export interface PrivacyNoticeProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function PrivacyNotice({ className = "", ...props }: PrivacyNoticeProps) {
  return (
    <div
      {...props}
      role="region"
      aria-label="Aviso de privacidad y protección de identidad"
      className={`rounded-xl border border-secondary/20 bg-primary/5 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-1.5 text-primary shrink-0">
          <ShieldCheck className="size-4" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="font-sans text-xs font-bold text-primary">
            Tu identidad está protegida
          </h3>
          <p className="font-sans text-xs leading-5 text-neutral-gray">
            Iniciar sesión con tu correo @unsch.edu.pe únicamente certifica que eres un estudiante
            de la universidad. Tu nombre, correo e ID jamás se almacenarán junto a tus reportes o
            comentarios.
          </p>
        </div>
      </div>
    </div>
  );
}
