import { BadgeShowcase } from "@/components/examples/BadgeShowcase";
import { ButtonShowcase } from "@/components/examples/ButtonShowcase";
import { PageContainer } from "@/components/layout/PageContainer";

export default function HomePage() {
  return (
    <PageContainer
      title="Biblioteca de componentes"
      subtitle="Indicadores, turnos y estados claros para el comedor universitario."
      badge="Sprint 2 · Demostración de interfaz"
    >
      <div className="space-y-8">
        <BadgeShowcase />
        <section aria-labelledby="buttons-showcase-title" className="space-y-4">
          <h2 id="buttons-showcase-title" className="text-lg font-semibold text-primary">Demostración de botones</h2>
          <ButtonShowcase />
        </section>
      </div>
    </PageContainer>
  );
}
