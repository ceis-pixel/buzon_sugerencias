import { PageContainer } from "@/components/common/page-container";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-gray/20 py-6">
      <PageContainer>
        <p className="text-sm text-neutral-gray">
          {siteConfig.serviceName} · Ayacucho, Perú
        </p>
      </PageContainer>
    </footer>
  );
}
