import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const linkClasses =
  "rounded transition-colors hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary";

export function Footer() {
  return (
    <footer className="print:hidden border-t border-gray-100 bg-white/60">
      <div className="mx-auto w-full max-w-xl px-4 py-6 text-center text-xs leading-6 text-neutral-gray space-y-3">
        <ShieldCheck aria-hidden="true" className="mx-auto size-5 text-secondary" />

        <p>
          Tus sugerencias son procesadas de manera 100% anónima para mejorar el
          servicio del comedor universitario.
        </p>

        <nav
          aria-label="Enlaces útiles"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-primary pt-1"
        >
          <Link href="/preguntas-frecuentes" className={linkClasses}>
            Preguntas Frecuentes
          </Link>
          <span aria-hidden="true" className="text-neutral-gray/40">•</span>
          <Link href="/preguntas-frecuentes#anonimato" className={linkClasses}>
            Privacidad y Términos
          </Link>
        </nav>

        <div className="pt-2 text-[11px] text-neutral-gray">
          <p className="font-medium text-gray-800">
            Junta de Vigilancia del Comedor Universitario (JVC) • CEIS UNSCH
          </p>
          <p>Universidad Nacional de San Cristóbal de Huamanga</p>
        </div>

        <Link
          href="/admin"
          className={`inline-block text-[11px] font-normal text-neutral-gray ${linkClasses}`}
        >
          Acceso Administrativo
        </Link>
      </div>
    </footer>
  );
}
