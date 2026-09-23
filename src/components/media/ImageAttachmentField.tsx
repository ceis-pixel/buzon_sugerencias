"use client";

import { Loader2 } from "lucide-react";
import { useCallback } from "react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { ImagePreviewCard } from "@/components/media/ImagePreviewCard";
import { ImageUploadTrigger } from "@/components/media/ImageUploadTrigger";
import { useImageCompressor } from "@/lib/hooks/useImageCompressor";

export interface ImageAttachmentFieldProps {
  value?: File | null;
  onChange?: (file: File | null) => void;
  disabled?: boolean;
  isUploading?: boolean;
  className?: string;
}

/**
 * Cohesive media attachment field combining:
 * 1. Dual-action mobile camera & gallery capture (ImageUploadTrigger)
 * 2. Client-side Canvas WebP compression (useImageCompressor)
 * 3. Verified preview card with lightbox and metrics (ImagePreviewCard)
 */
export function ImageAttachmentField({
  onChange,
  disabled = false,
  isUploading = false,
  className = "",
}: ImageAttachmentFieldProps) {
  const {
    isCompressing,
    error,
    result,
    compress,
    clear,
  } = useImageCompressor();

  const handleFileSelected = useCallback(
    async (file: File) => {
      const compressionResult = await compress(file);
      if (compressionResult) {
        onChange?.(compressionResult.file);
      }
    },
    [compress, onChange]
  );

  const handleRemove = useCallback(() => {
    clear();
    onChange?.(null);
  }, [clear, onChange]);

  return (
    <div className={["space-y-3", className].filter(Boolean).join(" ")}>
      {/* 1. Loading compression state */}
      {isCompressing && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-secondary/40 bg-secondary/5 p-6 text-center shadow-sm animate-fade-in sm:p-8"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary/10 text-primary">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="font-sans text-sm font-bold text-primary">
              Optimizando fotografía...
            </p>
            <p className="max-w-xs text-xs leading-5 text-neutral-gray">
              Redimensionando a máx. 1200 px y codificando en WebP para que el envío no consuma tus datos móviles.
            </p>
          </div>
        </div>
      )}

      {/* 2. Error message banner */}
      {error && !isCompressing && (
        <AlertBanner
          variant="error"
          title="No se pudo procesar la fotografía"
          description={error}
          onClose={clear}
        />
      )}

      {/* 3. Successful compressed preview card */}
      {result && !isCompressing && (
        <ImagePreviewCard
          previewUrl={result.previewUrl}
          originalSize={result.originalSize}
          compressedSize={result.compressedSize}
          fileName={result.file.name}
          onRemove={handleRemove}
          disabled={disabled || isUploading}
        />
      )}

      {/* 4. Initial capture trigger */}
      {!result && !isCompressing && (
        <ImageUploadTrigger
          onFileSelected={handleFileSelected}
          disabled={disabled || isUploading}
        />
      )}
    </div>
  );
}
