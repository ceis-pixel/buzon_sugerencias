import { MessageSquareText } from "lucide-react";

import { siteConfig } from "@/lib/site-config";

export function FeedbackWelcome() {
  return (
    <section aria-labelledby="welcome-title" className="max-w-3xl">
      <span className="mb-8 inline-flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-900">
        <MessageSquareText aria-hidden="true" className="size-7" />
      </span>
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-brand-900">
        Tu opinión cuenta
      </p>
      <h1
        id="welcome-title"
        className="text-balance text-4xl font-bold tracking-tight text-stone-900 sm:text-6xl"
      >
        {siteConfig.name}
      </h1>
      <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-stone-600">
        {siteConfig.description}
      </p>
      <div className="mt-10 max-w-xl border-l-4 border-brand-900 bg-white px-5 py-4">
        <h2 className="font-semibold text-stone-900">Próximamente</h2>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          Estamos preparando este espacio. Pronto podrás enviar tus sugerencias
          sobre el servicio del comedor.
        </p>
      </div>
    </section>
  );
}
