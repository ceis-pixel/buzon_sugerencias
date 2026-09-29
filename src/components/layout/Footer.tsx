import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="print:hidden border-t border-gray-100 bg-white/60">
      <div className="mx-auto w-full max-w-xl px-4 py-6 text-center text-xs leading-6 text-neutral-gray space-y-3">
        <ShieldCheck aria-hidden="true" className="mx-auto size-5 text-secondary" />

        <p>
          Tus sugerencias son procesadas de manera 100% anónima para mejorar el
          servicio del comedor universitario.
        </p>

        {/* Navigation links for FAQs, Transparency and Tracking */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-primary pt-1">
          <Link
            href="/preguntas-frecuentes"
            className="hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
          >
            Preguntas Frecuentes
          </Link>
          <span className="text-neutral-gray/40">•</span>
          <Link
            href="/transparencia"
            className="hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
          >
            Mural de Transparencia
          </Link>
          <span className="text-neutral-gray/40">•</span>
          <Link
            href="/seguimiento"
            className="hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
          >
            Consultar Ticket
          </Link>
        </div>

        <div className="pt-2 text-[11px] text-neutral-gray">
          <p className="font-medium text-gray-800">
            Secretaría de Salud y Nutrición FUSCH
          </p>
          <p>Universidad Nacional de San Cristóbal de Huamanga</p>
        </div>
      </div>
    </footer>
  );
}
