import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { OfflineBanner } from "@/components/common/OfflineBanner";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { manrope } from "@/lib/fonts";

import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#5C0000",
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Buzón de Sugerencias | Comedor Universitario UNSCH",
  description:
    "Canal institucional para sugerencias y observaciones del comedor universitario UNSCH.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Buzón UNSCH",
  },
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="flex min-h-screen flex-col bg-slate-50 font-sans text-neutral-gray antialiased">
        <OfflineBanner />
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
