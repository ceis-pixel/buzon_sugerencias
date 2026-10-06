import { LayoutList, Search, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import { HeaderAccountButton } from "@/components/layout/HeaderAccountButton";
import { siteConfig } from "@/lib/site-config";

const navLinkClasses =
  "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-reduce:transition-none";

export function Header() {
  return (
    <header className="print:hidden sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 py-3">
        <Link
          href="/"
          aria-label={`${siteConfig.serviceName} • ${siteConfig.name}, ir al inicio`}
          className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <UtensilsCrossed aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-primary">
              {siteConfig.serviceName}
            </span>
            <span className="block truncate text-xs font-medium text-neutral-gray">
              {siteConfig.name}
            </span>
          </span>
        </Link>

        <nav aria-label="Navegación principal" className="flex shrink-0 items-center gap-1">
          <Link href="/seguimiento" aria-label="Consultar Ticket" className={navLinkClasses}>
            <Search aria-hidden="true" className="size-5 sm:size-4" />
            <span className="hidden sm:inline">Consultar Ticket</span>
          </Link>
          <Link href="/transparencia" aria-label="Transparencia" className={navLinkClasses}>
            <LayoutList aria-hidden="true" className="size-5 sm:size-4" />
            <span className="hidden sm:inline">Transparencia</span>
          </Link>
          <HeaderAccountButton />
        </nav>
      </div>
    </header>
  );
}
