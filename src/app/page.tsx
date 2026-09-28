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
