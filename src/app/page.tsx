import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { PageContainer } from "@/components/layout/PageContainer";
import { DailyMenuCard } from "@/components/rating/DailyMenuCard";
import { SuggestionForm } from "@/components/suggestion/SuggestionForm";

// Rendered per request: the preselected shift depends on the current time, and a
// build-time prerender would freeze it at whatever hour the image was built.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <PageContainer>
      <h1 className="sr-only">Buzón de Sugerencias del Comedor Universitario UNSCH</h1>

      <div className="space-y-6">
        <section aria-labelledby="daily-menu-title">
          <h2 id="daily-menu-title" className="sr-only">
            Menú del día
          </h2>
          <DailyMenuCard />
        </section>

        <section aria-label="Formulario de sugerencias" className="space-y-3">
          <SignInPrompt />
          <SuggestionForm />
        </section>
      </div>
    </PageContainer>
  );
}
