"use client";

import {
  CheckCircle2,
  Cpu,
  FileImage,
  HardDriveDownload,
  Loader2,
  Maximize2,
  Scale,
  Trash2,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/Card";
import { ImageUploadTrigger } from "@/components/media/ImageUploadTrigger";
import { useImageCompressor } from "@/lib/hooks/useImageCompressor";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 0.1) {
    return `${megabytes.toFixed(2)} MB`;
  }
  const kilobytes = bytes / 1024;
  return `${kilobytes.toFixed(1)} KB`;
}

export function ImageUploadShowcase() {
  const [isSimulatedDisabled, setIsSimulatedDisabled] = useState(false);
  const {
    isCompressing,
    error: compressionError,
    result: compressionResult,
    compress,
    clear,
  } = useImageCompressor();

  const handleFileSelected = async (file: File) => {
    await compress(file);
  };

  const isDisabled = isSimulatedDisabled || isCompressing;

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle>Captura y Motor de Compresión de Evidencia Visual</CardTitle>
          <CardDescription>
            Cámara móvil (`capture=&quot;environment&quot;`), galería y motor de compresión WebP en cliente (Canvas API nativo).
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Toggle to test manual disabled state */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-neutral-gray cursor-pointer">
            <input
              type="checkbox"
              checked={isSimulatedDisabled}
              onChange={(e) => setIsSimulatedDisabled(e.target.checked)}
              className="size-4 accent-primary rounded"
            />
            Simular bloqueo por envío en curso
          </label>
        </div>

        {/* Upload Trigger Component */}
        <ImageUploadTrigger
          onFileSelected={handleFileSelected}
          disabled={isDisabled}
        />

        {/* Loading state during client-side compression */}
        {isCompressing && (
          <div
            role="status"
            className="flex items-center justify-center gap-3 rounded-2xl border border-secondary/30 bg-secondary/5 p-4 text-center text-sm font-medium text-primary animate-fade-in"
          >
            <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
            <span>Optimizando fotografía en el dispositivo (redimensionando a máx. 1200 px y codificando en WebP)...</span>
          </div>
        )}

        {/* Compression error notification */}
        {compressionError && (
          <AlertBanner
            variant="error"
            title="Error al optimizar imagen"
            description={compressionError}
          />
        )}

        {/* Technical live comparison card */}
        {compressionResult && !isCompressing && (
          <div
            role="status"
            aria-label="Resultados de optimización de imagen"
            className="space-y-4 rounded-2xl border border-secondary/30 bg-secondary/5 p-4 sm:p-6 transition-all animate-fade-in"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                {/* Image Preview */}
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-secondary/30 bg-white shadow-sm sm:size-28">
                  {compressionResult.previewUrl ? (
                    <Image
                      src={compressionResult.previewUrl}
                      alt="Vista previa optimizada"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-secondary">
                      <FileImage className="size-8" />
                    </div>
                  )}
                </div>

                {/* Main info */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-secondary">
                      <CheckCircle2 className="size-4" /> Optimización exitosa
                    </span>
                    <Badge variant="success">
                      Ahorro del {compressionResult.compressionRatio}%
                    </Badge>
                  </div>
                  <p className="truncate font-sans text-sm sm:text-base font-bold text-gray-900">
                    {compressionResult.file.name}
                  </p>
                  <p className="text-xs text-neutral-gray">
                    Formato: <span className="font-semibold text-gray-700">{compressionResult.file.type}</span>
                  </p>
                </div>
              </div>

              {/* Discard button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="size-4 text-primary" />}
                onClick={clear}
                className="self-end sm:self-start border border-primary/20 text-primary hover:bg-primary/10"
              >
                Descartar imagen
              </Button>
            </div>

            {/* Technical metrics grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
              <div className="rounded-xl border border-secondary/20 bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-neutral-gray mb-1">
                  <HardDriveDownload className="size-3.5 text-secondary" />
                  <span>Peso original</span>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {formatBytes(compressionResult.originalSize)}
                </p>
              </div>

              <div className="rounded-xl border border-secondary/20 bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-neutral-gray mb-1">
                  <Scale className="size-3.5 text-primary" />
                  <span>Peso optimizado</span>
                </div>
                <p className="text-sm font-bold text-primary">
                  {formatBytes(compressionResult.compressedSize)}
                </p>
              </div>

              <div className="rounded-xl border border-secondary/20 bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-neutral-gray mb-1">
                  <Maximize2 className="size-3.5 text-secondary" />
                  <span>Dimensiones</span>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {compressionResult.width} × {compressionResult.height} px
                </p>
              </div>

              <div className="rounded-xl border border-secondary/20 bg-white p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-neutral-gray mb-1">
                  <Cpu className="size-3.5 text-secondary" />
                  <span>Procesamiento</span>
                </div>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  <Zap className="size-3.5 text-amber-500 fill-amber-500" />
                  {compressionResult.processingTimeMs} ms
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
