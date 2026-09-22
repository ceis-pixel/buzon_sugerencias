import { AlertBannerShowcase } from "@/components/examples/AlertBannerShowcase";
import { BadgeShowcase } from "@/components/examples/BadgeShowcase";
import { ButtonShowcase } from "@/components/examples/ButtonShowcase";
import { CardModalShowcase } from "@/components/examples/CardModalShowcase";
import { EmptyStateShowcase } from "@/components/examples/EmptyStateShowcase";
import { FormFieldsShowcase } from "@/components/examples/FormFieldsShowcase";
import { PageContainer } from "@/components/layout/PageContainer";

export default function HomePage() {
  return (
    <PageContainer
      title="Biblioteca de componentes"
      subtitle="Botones, campos, indicadores y mensajes para una experiencia clara y cercana."
      badge="Sprint 2 · Demostración de interfaz"
    >
      <div className="space-y-8">
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
