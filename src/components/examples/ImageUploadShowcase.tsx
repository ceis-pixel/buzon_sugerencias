"use client";

import {
  Cpu,
  HardDriveDownload,
  Maximize2,
  Scale,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/Card";
import { ImageAttachmentField } from "@/components/media/ImageAttachmentField";
import { ImagePreviewCard } from "@/components/media/ImagePreviewCard";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

export function ImageUploadShowcase() {
  const [isSimulatedDisabled, setIsSimulatedDisabled] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Standalone preview card demo state
  const [showStandaloneDemo, setShowStandaloneDemo] = useState(true);

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle>Captura y Motor de Compresión de Evidencia Visual</CardTitle>
          <CardDescription>
            Cámara móvil (`capture=&quot;environment&quot;`), compresión WebP en cliente y visor interactivo con métricas.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Toggle controls */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-gray">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSimulatedDisabled}
              onChange={(e) => setIsSimulatedDisabled(e.target.checked)}
              className="size-4 accent-primary rounded"
            />
            Simular bloqueo por envío en curso
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showStandaloneDemo}
              onChange={(e) => setShowStandaloneDemo(e.target.checked)}
              className="size-4 accent-primary rounded"
            />
            Mostrar tarjeta de muestra con métricas estáticas
          </label>
        </div>

        {/* 1. Main Unified Flow Component (ImageAttachmentField) */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-primary">
            Campo interactivo integrado (`ImageAttachmentField`):
          </h3>
          <ImageAttachmentField
            value={attachedFile}
            onChange={(file) => setAttachedFile(file)}
            disabled={isSimulatedDisabled}
          />
        </div>

        {/* 2. Standalone Demo Card for Direct Inspection */}
        {showStandaloneDemo && (
          <div className="space-y-2 border-t border-secondary/15 pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-primary">
                Demostración de componente `ImagePreviewCard` con datos de muestra:
              </h3>
            </div>

            <ImagePreviewCard
              previewUrl="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='900' viewBox='0 0 1200 900'><rect width='1200' height='900' fill='%235C0000'/><text x='50%25' y='45%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' fill='white' font-weight='bold'>Comedor UNSCH - Evidencia de Menú</text><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='28' fill='%23A6665C'>Resolución optimizada a 1200 x 900 px</text></svg>"
              fileName="foto_bandeja_almuerzo.webp"
              originalSize={4.85 * 1024 * 1024} // 4.85 MB
              compressedSize={118 * 1024}        // 118 KB
              onRemove={() => setShowStandaloneDemo(false)}
            />

            {/* Static metrics grid preview */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1">
              <div className="rounded-xl border border-secondary/20 bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-neutral-gray mb-1">
                  <HardDriveDownload className="size-3.5 text-secondary" />
                  <span>Peso original</span>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {formatBytes(4.85 * 1024 * 1024)}
                </p>
              </div>

              <div className="rounded-xl border border-secondary/20 bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-neutral-gray mb-1">
                  <Scale className="size-3.5 text-primary" />
                  <span>Peso optimizado</span>
                </div>
                <p className="text-sm font-bold text-primary">
                  {formatBytes(118 * 1024)}
                </p>
              </div>

              <div className="rounded-xl border border-secondary/20 bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-neutral-gray mb-1">
                  <Maximize2 className="size-3.5 text-secondary" />
                  <span>Dimensiones</span>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  1200 × 900 px
                </p>
              </div>

              <div className="rounded-xl border border-secondary/20 bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-neutral-gray mb-1">
                  <Cpu className="size-3.5 text-secondary" />
                  <span>Procesamiento</span>
                </div>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  <Zap className="size-3.5 text-amber-500 fill-amber-500" />
                  142 ms
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
