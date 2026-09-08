import { UtensilsCrossed } from "lucide-react";

import { PageContainer } from "@/components/common/page-container";
import { siteConfig } from "@/lib/site-config";

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white py-5">
      <PageContainer>
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-900 text-white">
            <UtensilsCrossed aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-stone-900">{siteConfig.serviceName}</p>
            <p className="mt-0.5 text-sm text-stone-600">
              {siteConfig.institution}
            </p>
          </div>
        </div>
      </PageContainer>
    </header>
  );
}
