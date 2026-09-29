import { AlertBannerShowcase } from "@/components/examples/AlertBannerShowcase";
import { AuthShowcase } from "@/components/examples/AuthShowcase";
import { BadgeShowcase } from "@/components/examples/BadgeShowcase";
import { ButtonShowcase } from "@/components/examples/ButtonShowcase";
import { CardModalShowcase } from "@/components/examples/CardModalShowcase";
import { EmptyStateShowcase } from "@/components/examples/EmptyStateShowcase";
import { FormFieldsShowcase } from "@/components/examples/FormFieldsShowcase";
import { ImageUploadShowcase } from "@/components/examples/ImageUploadShowcase";
import { SuggestionFormShowcase } from "@/components/examples/SuggestionFormShowcase";
import { SuggestionForm } from "@/components/suggestion/SuggestionForm";
import { PageContainer } from "@/components/layout/PageContainer";

export default function HomePage() {
  return (
    <PageContainer
      title="Buzón de Sugerencias y Reclamos"
      subtitle="Canal anónimo y seguro para la comunidad universitaria de la UNSCH."
      badge="Sprint 6 completo · Formulario con React Hook Form, Zod y contador visual"
    >
      <div className="space-y-8">
        {/* Sprint 7 navigation banner */}
        <section aria-labelledby="sprint7-title" className="space-y-2">
          <h2 id="sprint7-title" className="text-lg font-semibold text-primary">
            Sprint 7 — Módulo de seguimiento de tickets
          </h2>
          <a
            href="/seguimiento"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
          >
            Ir al módulo de seguimiento →
          </a>
        </section>

        {/* Sprint 8 navigation banner */}
        <section aria-labelledby="sprint8-title" className="space-y-2">
          <h2 id="sprint8-title" className="text-lg font-semibold text-primary">
            Sprint 8 — Panel de Moderación y Gestión FUSCH
          </h2>
          <a
            href="/admin"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Acceder al Panel Administrativo (/admin) →
          </a>
        </section>

        {/* Sprint 9 navigation banner */}
        <section aria-labelledby="sprint9-title" className="space-y-2">
          <h2 id="sprint9-title" className="text-lg font-semibold text-primary">
            Sprint 9 — Afiche Oficial con Código QR para Mesas (/qr-flyer)
          </h2>
          <a
            href="/qr-flyer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Ver e Imprimir Afiche QR para Mesas (/qr-flyer) →
          </a>
        </section>

        {/* Sprint 10 navigation banner */}
        <section aria-labelledby="sprint10-title" className="space-y-2">
          <h2 id="sprint10-title" className="text-lg font-semibold text-primary">
            Sprint 10 — Transparencia Pública y Centro de Ayuda
          </h2>
          <div className="flex flex-wrap gap-2.5">
            <a
              href="/transparencia"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Mural de Transparencia Pública (/transparencia) →
            </a>
            <a
              href="/preguntas-frecuentes"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-gray/30 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Preguntas Frecuentes (/preguntas-frecuentes) →
            </a>
          </div>
        </section>

        <section aria-labelledby="form-live-title" className="space-y-4">
          <SuggestionForm />
        </section>

        <section aria-labelledby="showcase-title" className="space-y-4">
          <h2 id="showcase-title" className="text-lg font-semibold text-primary">
            Demostración de selectores de turno y categoría (Issues 6.1 y 6.2)
          </h2>
          <SuggestionFormShowcase />
        </section>
        <ImageUploadShowcase />
        <AuthShowcase />
        <AlertBannerShowcase />
        <FormFieldsShowcase />
        <EmptyStateShowcase />
        <CardModalShowcase />
        <BadgeShowcase />
        <section aria-labelledby="buttons-showcase-title" className="space-y-4">
          <h2 id="buttons-showcase-title" className="text-lg font-semibold text-primary">Demostración de botones</h2>
          <ButtonShowcase />
        </section>
      </div>
    </PageContainer>
  );
}
