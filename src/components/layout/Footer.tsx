import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white/60">
      <div className="mx-auto w-full max-w-xl px-4 py-6 text-center text-xs leading-6 text-neutral-gray">
        <ShieldCheck aria-hidden="true" className="mx-auto mb-2 size-5 text-secondary" />
        <p>
          Tus sugerencias son procesadas de manera 100% anónima para mejorar el
          servicio del comedor universitario.
        </p>
        <p className="mt-3 font-medium">
          Secretaría de Salud y Nutrición FUSCH
        </p>
        <p>Universidad Nacional de San Cristóbal de Huamanga</p>
      </div>
    </footer>
  );
}
