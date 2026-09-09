import { MessageSquareText } from "lucide-react";

import { siteConfig } from "@/lib/site-config";

export function FeedbackWelcome() {
  return (
    <section aria-labelledby="welcome-title" className="max-w-3xl">
      <span className="mb-8 inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MessageSquareText aria-hidden="true" className="size-7" />
      </span>
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
        Tu opinión cuenta
      </p>
      <h1
        id="welcome-title"
        className="text-balance text-4xl font-bold tracking-tight text-primary sm:text-6xl"
      >
        {siteConfig.name}
      </h1>
      <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-neutral-gray">
        {siteConfig.description}
      </p>
      <div className="mt-10 max-w-xl rounded-2xl border-l-4 border-primary bg-white px-5 py-4 shadow-sm">
        <h2 className="font-semibold text-primary">Próximamente</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-gray">
          Estamos preparando este espacio. Pronto podrás enviar tus sugerencias
          sobre el servicio del comedor.
        </p>
      </div>
    </section>
  );
}
