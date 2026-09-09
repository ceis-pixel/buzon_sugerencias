import { FeedbackWelcome } from "@/components/feedback/feedback-welcome";
import { PageContainer } from "@/components/layout/PageContainer";

export default function HomePage() {
  return (
    <PageContainer
      title="Tu opinión cuenta"
      subtitle="Un espacio para mejorar juntos el comedor universitario."
      badge="Vista de demostración"
    >
      <FeedbackWelcome />
    </PageContainer>
  );
}
