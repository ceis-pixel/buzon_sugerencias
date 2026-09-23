import { Search, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import { HeaderLogoutButton } from "@/components/layout/HeaderLogoutButton";
import { siteConfig } from "@/lib/site-config";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 py-3">
        <Link
          href="/"
          aria-label="Comedor UNSCH, ir al inicio"
          className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <UtensilsCrossed aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-sm font-bold text-primary">
              {siteConfig.serviceName}
            </span>
            <span className="block whitespace-nowrap text-xs font-medium text-neutral-gray">
              {siteConfig.name}
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-secondary/20 bg-primary/5 px-2 py-1 text-xs font-semibold text-primary">
            FUSCH<span className="hidden sm:inline"> · Salud y Nutrición</span>
          </span>
          <Link
            href="/#ticket-lookup"
            aria-label="Consultar un ticket"
            title="Consultar un ticket"
            className="flex size-11 items-center justify-center rounded-xl border border-secondary/20 text-primary hover:bg-primary/5"
          >
            <Search aria-hidden="true" className="size-5" />
          </Link>
          <HeaderLogoutButton />
        </div>
      </div>
    </header>
  );
}
