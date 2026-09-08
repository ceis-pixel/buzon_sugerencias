import { PageContainer } from "@/components/common/page-container";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 py-6">
      <PageContainer>
        <p className="text-sm text-stone-600">
          {siteConfig.serviceName} · Ayacucho, Perú
        </p>
      </PageContainer>
    </footer>
  );
}
