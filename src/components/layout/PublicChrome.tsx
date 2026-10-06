"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Renders the public header and footer everywhere except the admin console,
 * which has its own operational top bar.
 */
export function PublicChrome({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return <>{children}</>;
}
