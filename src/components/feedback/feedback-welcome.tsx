"use client";

import { MessageSquareText, Search, Send } from "lucide-react";
import { useState } from "react";

const demoMessages = {
  suggestion:
    "Próximamente podrás enviar tu sugerencia y recibir un código de ticket para consultar su seguimiento.",
  ticket:
    "Próximamente podrás consultar el estado de tu sugerencia ingresando tu código de ticket.",
} as const;

export function FeedbackWelcome() {
  const [activeAction, setActiveAction] = useState<keyof typeof demoMessages | null>(null);

  return (
    <section
      aria-labelledby="welcome-title"
      className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <MessageSquareText aria-hidden="true" className="size-6" />
      </span>
      <h2
        id="welcome-title"
        className="text-lg font-semibold text-primary"
      >
        Comparte tu experiencia
      </h2>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-gray">
        Cuéntanos qué podemos mejorar en la atención, los alimentos o los
        espacios. Tu aporte ayuda a cuidar el bienestar de nuestra comunidad.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setActiveAction("suggestion")}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
        >
          <Send aria-hidden="true" className="size-4 shrink-0" />
          Enviar una sugerencia
        </button>
        <button
          id="ticket-lookup"
          type="button"
          onClick={() => setActiveAction("ticket")}
          className="inline-flex min-h-12 w-full scroll-mt-24 items-center justify-center gap-2 rounded-xl border border-secondary/30 bg-white px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5"
        >
          <Search aria-hidden="true" className="size-4 shrink-0" />
          Consultar mi ticket
        </button>
      </div>
      <div role="status" aria-atomic="true">
        {activeAction && (
          <p className="mt-4 rounded-xl border border-tertiary/20 bg-tertiary/5 p-3 text-sm leading-6 text-tertiary">
            {demoMessages[activeAction]}
          </p>
        )}
      </div>
    </section>
  );
}
