import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageContainer } from "@/components/common/page-container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/lib/site-config";

import "./globals.css";

export const metadata: Metadata = {
  title: `${siteConfig.name} - ${siteConfig.serviceName}`,
  description: siteConfig.description,
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang={siteConfig.locale}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only rounded-xl bg-primary px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 items-center py-16 sm:py-24"
        >
          <PageContainer>{children}</PageContainer>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
