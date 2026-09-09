import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { manrope } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "Buzón de Sugerencias | Comedor Universitario UNSCH",
  description:
    "Canal institucional para sugerencias y observaciones del comedor universitario UNSCH.",
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="flex min-h-screen flex-col bg-slate-50 font-sans text-neutral-gray antialiased">
        <a
          href="#main-content"
          className="sr-only rounded-xl bg-primary px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        >
          Saltar al contenido
        </a>
        <Header />
        <main
          id="main-content"
          tabIndex={-1}
          className="w-full flex-1"
        >
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
