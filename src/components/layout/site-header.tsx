import { UtensilsCrossed } from "lucide-react";

import { PageContainer } from "@/components/common/page-container";
import { siteConfig } from "@/lib/site-config";

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-gray/20 bg-white py-5">
      <PageContainer>
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <UtensilsCrossed aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-primary">{siteConfig.serviceName}</p>
            <p className="mt-0.5 text-sm text-neutral-gray">
              {siteConfig.institution}
            </p>
          </div>
        </div>
      </PageContainer>
    </header>
  );
}
