"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Info,
  Printer,
  ShieldCheck,
  Smartphone,
  Ticket,
  UtensilsCrossed,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { copyToClipboard } from "@/lib/utils/clipboard";

type FlyerSize = "a4" | "a5";

function getInitialAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && !configured.includes("localhost")) {
    return configured;
  }
  return "https://buzon-comedor.unsch.edu.pe";
}

export default function QrFlyerPage() {
  const [size, setSize] = useState<FlyerSize>("a4");
  const [appUrl] = useState<string>(getInitialAppUrl);
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(appUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isA4 = size === "a4";

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-2 sm:px-6 print:min-h-0 print:bg-white print:p-0">
      {/* On-Screen Interactive Control Bar (Hidden when printing) */}
      <div className="print:hidden mx-auto max-w-4xl mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-gray-200 text-neutral-gray hover:bg-slate-50 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Volver al buzón principal"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-gray-900">
                Plantilla Imprimible de Afiche QR para Mesas
              </h1>
              <p className="text-xs text-neutral-gray">
                Diseñado para plastificado y señalización en el comedor universitario UNSCH
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Format toggle: A4 vs A5 */}
            <div className="inline-flex rounded-xl border border-gray-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setSize("a4")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  isA4
                    ? "bg-primary text-white shadow-xs"
                    : "text-gray-700 hover:text-primary"
                }`}
              >
                A4 (Pared / Puerta)
              </button>
              <button
                type="button"
                onClick={() => setSize("a5")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  !isA4
                    ? "bg-primary text-white shadow-xs"
                    : "text-gray-700 hover:text-primary"
                }`}
              >
                A5 (Mesa / Soporte)
              </button>
            </div>

            {/* Direct Print Button */}
            <Button
              variant="primary"
              size="md"
              leftIcon={<Printer className="size-4" />}
              onClick={handlePrint}
              className="shadow-md"
            >
              Imprimir Afiche
            </Button>
          </div>
        </div>

        {/* Informative advice for dining hall team */}
        <div className="flex items-start gap-2.5 rounded-xl border border-secondary/30 bg-secondary/10 p-3 text-xs text-secondary">
          <Info className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">
              Recomendación de producción física:
            </p>
            <p className="text-gray-700">
              Imprimir en papel couche o cartulina satinada (200g - 300g) y plastificar en frío/calor, o insertar en soportes acrílicos transparentes de mesa (tipo T invertida en formato A5) para proteger el afiche de humedad, líquidos y desinfectantes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary underline hover:opacity-80"
              title="Copiar URL de destino"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "URL copiada" : "Copiar URL"}
            </button>
          </div>
        </div>
      </div>

      {/* Physical Sheet Container (Exact A4 or A5 proportions) */}
      <div
        id="printable-flyer"
        className={`mx-auto bg-white transition-all duration-200 print:shadow-none print:m-0 print:border-none ${
          isA4
            ? "w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 shadow-xl border border-gray-300 rounded-2xl"
            : "w-full max-w-[148mm] min-h-[210mm] p-4 sm:p-6 shadow-xl border border-gray-300 rounded-2xl"
        }`}
        style={{
          boxSizing: "border-box",
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        {/* Double Crimson Institutional Frame */}
        <div
          className={`flex flex-col justify-between h-full border-4 border-primary rounded-xl relative p-4 sm:p-6 ${
            isA4 ? "min-h-[265mm]" : "min-h-[190mm]"
          }`}
          style={{ borderColor: "#5C0000" }}
        >
          {/* Inner hairline secondary border */}
          <div
            className="absolute inset-1.5 border border-secondary/40 rounded-lg pointer-events-none"
            style={{ borderColor: "rgba(166, 102, 92, 0.4)" }}
          />

          {/* Top Section: Institutional Header & Crest */}
          <div className="relative text-center space-y-3 z-10">
            {/* Heraldic Badges & Monogram */}
            <div className="flex items-center justify-center gap-3">
              {/* Institutional Crest SVG Emblem */}
              <div
                className="flex items-center justify-center rounded-2xl bg-primary text-white shadow-sm p-2.5"
                style={{ backgroundColor: "#5C0000" }}
              >
                <UtensilsCrossed className={isA4 ? "size-7" : "size-5"} />
              </div>
              <div className="text-left">
                <span
                  className="block text-[11px] sm:text-xs font-extrabold tracking-widest uppercase text-primary"
                  style={{ color: "#5C0000" }}
                >
                  Universidad Nacional de San Cristóbal de Huamanga
                </span>
                <span className="block text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-neutral-gray">
                  Comedor Universitario • Sede Central
                </span>
              </div>
            </div>

            {/* Backing Seals Row */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              <Badge variant="secondary" size={isA4 ? "md" : "sm"}>
                Junta de Vigilancia del Comedor Universitario (JVC)
              </Badge>
              <Badge variant="tertiary" size={isA4 ? "md" : "sm"}>
                CEIS UNSCH
              </Badge>
              <Badge variant="neutral" size={isA4 ? "md" : "sm"}>
                Garantía 100% Anónima
              </Badge>
            </div>

            {/* Main Headline */}
            <div className="pt-1">
              <h2
                className={`font-sans font-black tracking-tight text-primary leading-tight ${
                  isA4 ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"
                }`}
                style={{ color: "#5C0000" }}
              >
                Buzón de Sugerencias y Observaciones
              </h2>
              <p
                className={`font-sans font-medium text-neutral-gray mt-1 ${
                  isA4 ? "text-sm sm:text-base max-w-xl mx-auto" : "text-xs"
                }`}
              >
                Tu opinión directa para una atención justa, higiénica y de calidad en el servicio alimentario.
              </p>
            </div>
          </div>

          {/* Central Section: High-Resolution Vector QR Code */}
          <div className="relative my-auto py-3 text-center space-y-3 z-10">
            <div className="inline-block relative">
              {/* White badge box with crimson framing */}
              <div
                className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-primary/30 shadow-md inline-flex flex-col items-center"
                style={{ borderColor: "#5C0000" }}
              >
                <QRCodeSVG
                  value={appUrl}
                  size={isA4 ? 220 : 160}
                  level="Q"
                  fgColor="#5C0000"
                  bgColor="#FFFFFF"
                  marginSize={1}
                  imageSettings={{
                    src: "/icons/icon.svg",
                    x: undefined,
                    y: undefined,
                    height: isA4 ? 40 : 28,
                    width: isA4 ? 40 : 28,
                    opacity: 1,
                    excavate: true,
                  }}
                />

                <span
                  className="mt-3 block text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-primary"
                  style={{ color: "#5C0000" }}
                >
                  Escanea para enviar tu reporte
                </span>
              </div>
            </div>

            {/* Direct human-readable URL fallback */}
            <div className="space-y-0.5">
              <p className="text-[11px] text-neutral-gray font-medium">
                ¿No puedes escanear el código? Ingresa desde tu navegador a:
              </p>
              <p
                className={`font-mono font-bold tracking-tight text-primary underline underline-offset-2 ${
                  isA4 ? "text-sm sm:text-base" : "text-xs"
                }`}
                style={{ color: "#5C0000" }}
              >
                {appUrl.replace(/^https?:\/\//, "")}
              </p>
            </div>
          </div>

          {/* Bottom Section: Didactic 3-Step Guide */}
          <div className="relative z-10 space-y-3">
            <div
              className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-left`}
            >
              {/* Step 1 */}
              <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-gray-200">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white font-bold text-xs"
                  style={{ backgroundColor: "#5C0000" }}
                >
                  <Smartphone className="size-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold text-gray-900 leading-tight">
                    1. Escanea el QR
                  </span>
                  <span className="block text-[10px] text-neutral-gray leading-tight mt-0.5">
                    Apunta la cámara de tu celular. No requiere instalar apps.
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-gray-200">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white font-bold text-xs"
                  style={{ backgroundColor: "#5C0000" }}
                >
                  <ShieldCheck className="size-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold text-gray-900 leading-tight">
                    2. Ingreso @unsch.edu.pe
                  </span>
                  <span className="block text-[10px] text-neutral-gray leading-tight mt-0.5">
                    Valida que eres comensal. Tu reporte es 100% anónimo.
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-gray-200">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white font-bold text-xs"
                  style={{ backgroundColor: "#5C0000" }}
                >
                  <Ticket className="size-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold text-gray-900 leading-tight">
                    3. Guarda tu Código
                  </span>
                  <span className="block text-[10px] text-neutral-gray leading-tight mt-0.5">
                    Consulta la respuesta y medidas correctivas de la JVC.
                  </span>
                </div>
              </div>
            </div>

            {/* Official Backing Footer */}
            <div className="pt-2 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-1.5 text-[9px] sm:text-[10px] text-neutral-gray">
              <span className="font-semibold text-gray-800">
                Junta de Vigilancia del Comedor Universitario (JVC) & CEIS UNSCH
              </span>
              <span>
                Canal Oficial de Transparencia y Bienestar Universitario — Ayacucho
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
