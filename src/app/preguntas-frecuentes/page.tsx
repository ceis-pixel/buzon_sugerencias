import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { PageContainer } from "@/components/layout/PageContainer";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes y Centro de Ayuda • Comedor UNSCH",
  description:
    "Centro de ayuda didáctico sobre el funcionamiento del buzón de sugerencias, garantías de anonimato, turnos del comedor y seguimiento de tickets.",
};

/**
 * /preguntas-frecuentes — Help Center & FAQ Page (Issue 10.5)
 *
 * Public educational resource for the UNSCH university community explaining:
 * - Zero-knowledge anonymous dissociation.
 * - Role of the dining hall oversight board (JVC).
 * - Loss of ticket codes and local device history.
 * - Service hours for Breakfast, Lunch, and Dinner.
 * - Official response turnaround times.
 */
export default function PreguntasFrecuentesPage() {
  return (
    <PageContainer
      title="Centro de Ayuda y Preguntas Frecuentes"
      subtitle="Conoce cómo funciona el buzón de sugerencias, cómo se protege tu anonimato y qué medidas toma la Junta de Vigilancia del Comedor Universitario (JVC)."
      badge="Atención y Transparencia Estudiantil"
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-gray hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Buzón Principal</span>
          </Link>

          <Link
            href="/transparencia"
            className="text-xs font-bold text-primary hover:underline"
          >
            Ver Mural de Transparencia →
          </Link>
        </div>

        {/* Interactive FAQ Accordion */}
        <FaqAccordion />

        {/* Quick Contact & Feedback Notice */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center text-xs text-neutral-gray space-y-2 shadow-xs">
          <p className="font-semibold text-gray-800">
            ¿Tienes alguna consulta adicional no resuelta en esta sección?
          </p>
          <p>
            Puedes dirigirte a la Junta de Vigilancia del Comedor Universitario (JVC) o enviar una
            sugerencia en la categoría &ldquo;Atención&rdquo;.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
