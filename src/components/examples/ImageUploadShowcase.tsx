"use client";

import {
  CloudUpload,
  Cpu,
  ExternalLink,
  HardDriveDownload,
  Loader2,
  Maximize2,
  Scale,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/Card";
import { ImageAttachmentField } from "@/components/media/ImageAttachmentField";
import { ImagePreviewCard } from "@/components/media/ImagePreviewCard";
import {
  deleteSuggestionImage,
  uploadSuggestionImage,
  type UploadImageResult,
} from "@/lib/services/storageService";

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

  // Storage upload test state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadImageResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState<string | null>(null);

  const handleTestUpload = async (fileToUpload?: File) => {
    setIsUploading(true);
    setUploadError(null);
    setDeletionMessage(null);

    try {
      let targetFile: File;

      if (fileToUpload) {
        targetFile = fileToUpload;
      } else {
        // Create an optimized WebP sample file
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#5C0000"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="36" fill="white" font-weight="bold">Prueba de Subida - Comedor UNSCH</text></svg>`;
        const blob = new Blob([svgContent], { type: "image/webp" });
        targetFile = new File([blob], "muestra_optimizada.webp", {
          type: "image/webp",
          lastModified: Date.now(),
        });
      }

      const result = await uploadSuggestionImage(targetFile);
      setUploadResult(result);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Error inesperado al subir la imagen al almacenamiento."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteUploaded = async () => {
    if (!uploadResult) return;
    setIsDeleting(true);
    setUploadError(null);

    try {
      await deleteSuggestionImage(uploadResult.storagePath);
      setDeletionMessage("Imagen eliminada exitosamente del bucket de almacenamiento.");
      setUploadResult(null);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Error al eliminar la imagen del almacenamiento."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle>Captura y Motor de Compresión de Evidencia Visual</CardTitle>
          <CardDescription>
            Cámara móvil (`capture=&quot;environment&quot;`), compresión WebP en cliente y pipeline de subida a Supabase Storage (`suggestion-media`).
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">
              Campo interactivo integrado (`ImageAttachmentField`):
            </h3>
            {attachedFile && (
              <Badge variant="secondary" size="sm">
                Archivo listo para envío ({formatBytes(attachedFile.size)})
              </Badge>
            )}
          </div>

          <ImageAttachmentField
            value={attachedFile}
            onChange={(file) => {
              setAttachedFile(file);
              setUploadResult(null);
              setUploadError(null);
            }}
            disabled={isSimulatedDisabled || isUploading}
            isUploading={isUploading}
          />

          {/* Action button to test uploading the attached file */}
          {attachedFile && !uploadResult && (
            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isUploading}
                leftIcon={<CloudUpload className="size-4" />}
                onClick={() => handleTestUpload(attachedFile)}
              >
                Simular envío y subida de evidencia a Supabase Storage
              </Button>
            </div>
          )}
        </div>

        {/* 2. Storage Upload Test Pipeline Results */}
        {(uploadResult || uploadError || deletionMessage || isUploading) && (
          <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-4 sm:p-5 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudUpload className="size-5 text-primary" />
                <h4 className="text-sm font-bold text-gray-900">
                  Estado del Pipeline de Almacenamiento (Supabase Storage)
                </h4>
              </div>
              {uploadResult && (
                <Badge variant="success" size="sm">
                  Subida exitosa
                </Badge>
              )}
            </div>

            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="size-4 animate-spin" />
                <span>Transfiriendo archivo con cabeceras de caché CDN y ruta particionada...</span>
              </div>
            )}

            {uploadError && (
              <AlertBanner
                variant="error"
                title="Error en el pipeline de almacenamiento"
                description={uploadError}
                onClose={() => setUploadError(null)}
              />
            )}

            {deletionMessage && (
              <AlertBanner
                variant="info"
                title="Operación completada"
                description={deletionMessage}
                onClose={() => setDeletionMessage(null)}
              />
            )}

            {uploadResult && (
              <div className="space-y-2 pt-1 text-xs">
                <div>
                  <span className="font-semibold text-gray-700">Ruta particionada (UUID):</span>{" "}
                  <code className="rounded bg-white px-2 py-0.5 font-mono text-primary border border-secondary/20">
                    {uploadResult.storagePath}
                  </code>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-700">URL pública CDN:</span>
                  <a
                    href={uploadResult.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    <span>Abrir en nueva pestaña</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isLoading={isDeleting}
                    leftIcon={<Trash2 className="size-3.5 text-primary" />}
                    onClick={handleDeleteUploaded}
                    className="border border-primary/20 text-primary hover:bg-primary/10"
                  >
                    Eliminar imagen del bucket (`deleteSuggestionImage`)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Standalone Demo Card for Direct Inspection */}
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
