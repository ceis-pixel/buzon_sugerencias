import { ButtonShowcase } from "@/components/examples/ButtonShowcase";
import { PageContainer } from "@/components/layout/PageContainer";

export default function HomePage() {
  return (
    <PageContainer
      title="Biblioteca de componentes"
      subtitle="Botones claros y consistentes para cada acción del comedor universitario."
      badge="Sprint 2 · Demostración de interfaz"
    >
      <ButtonShowcase />
    </PageContainer>
  );
}
