"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { ImagePreviewCard } from "@/components/media/ImagePreviewCard";
import { ImageUploadTrigger } from "@/components/media/ImageUploadTrigger";
import dynamic from "next/dynamic";

const UploadFallbackModal = dynamic(
  () =>
    import("@/components/media/UploadFallbackModal").then(
      (mod) => mod.UploadFallbackModal
    ),
  { ssr: false }
);

import { UploadProgressCard } from "@/components/media/UploadProgressCard";
import { useImageCompressor } from "@/lib/hooks/useImageCompressor";
import type { UploadStatus } from "@/lib/hooks/useResilientUpload";

export interface ImageAttachmentFieldProps {
  value?: File | null;
  onChange?: (file: File | null) => void;
  disabled?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadStatus?: UploadStatus;
  uploadError?: string | null;
  /** Number of upload attempts made so far (drives auto-fallback trigger). */
  uploadAttempts?: number;
  onRetryUpload?: () => void;
  onCancelUpload?: () => void;
  /** Called when the student explicitly chooses to discard the photo. */
  onDiscardPhoto?: () => void;
  className?: string;
}

/**
 * Cohesive media attachment field combining:
 * 1. Dual-action mobile camera & gallery capture (ImageUploadTrigger)
 * 2. Client-side Canvas WebP compression (useImageCompressor)
 * 3. Verified preview card with lightbox and metrics (ImagePreviewCard)
 * 4. Resilient upload feedback with progress bar, retry, and cancellation (UploadProgressCard)
 * 5. Graceful degradation modal after persistent failures (UploadFallbackModal) — Issue 5.6
 */
export function ImageAttachmentField({
  onChange,
  disabled = false,
  isUploading = false,
  uploadProgress = 0,
  uploadStatus = "idle",
  uploadError = null,
  uploadAttempts = 0,
  onRetryUpload,
  onCancelUpload,
  onDiscardPhoto,
  className = "",
}: ImageAttachmentFieldProps) {
  const {
    isCompressing,
    error: compressionError,
    result,
    compress,
    clear,
  } = useImageCompressor();

  // Track whether the fallback modal has been auto-triggered for this session
  const [isFallbackOpen, setIsFallbackOpen] = useState(false);
  const fallbackShownRef = useRef(false);

  // Auto-show fallback modal after ≥2 failed attempts
  useEffect(() => {
    if (
      uploadStatus === "error" &&
      uploadAttempts >= 2 &&
      !fallbackShownRef.current
    ) {
      fallbackShownRef.current = true;
      setIsFallbackOpen(true);
    }
  }, [uploadStatus, uploadAttempts]);

  // Reset the auto-trigger guard whenever the file is cleared or a new one is picked.
  // We deliberately avoid calling setState inside the effect body to prevent cascading renders.
  // Instead, derive the open state: if there's no compressed result the modal must be closed.
  const effectiveFallbackOpen = isFallbackOpen && result !== null;


  const handleFileSelected = useCallback(
    async (file: File) => {
      fallbackShownRef.current = false;
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
    onDiscardPhoto?.();
    // Reset auto-trigger guard so the modal can re-arm if a new file is picked
    fallbackShownRef.current = false;
    setIsFallbackOpen(false);
  }, [clear, onChange, onDiscardPhoto]);

  const handleFallbackDiscard = useCallback(() => {
    setIsFallbackOpen(false);
    handleRemove();
  }, [handleRemove]);

  const handleFallbackRetry = useCallback(() => {
    setIsFallbackOpen(false);
    fallbackShownRef.current = false;
    onRetryUpload?.();
  }, [onRetryUpload]);

  const isUploadInProgress =
    isUploading ||
    uploadStatus === "uploading" ||
    uploadStatus === "retrying" ||
    uploadStatus === "error";

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

      {/* 2. Compression error banner */}
      {compressionError && !isCompressing && (
        <AlertBanner
          variant="error"
          title="No se pudo procesar la fotografía"
          description={compressionError}
          onClose={clear}
        />
      )}

      {/* 3. Active Resilient Upload Progress Card */}
      {isUploadInProgress && (
        <UploadProgressCard
          progress={uploadProgress}
          status={
            uploadStatus === "error"
              ? "error"
              : uploadStatus === "retrying"
              ? "retrying"
              : "uploading"
          }
          errorMessage={uploadError}
          onRetry={onRetryUpload}
          onCancel={onCancelUpload}
          onDiscard={handleRemove}
          fileName={result?.file.name}
        />
      )}

      {/* 4. Successful compressed preview card (when not actively uploading) */}
      {result && !isCompressing && !isUploadInProgress && (
        <ImagePreviewCard
          previewUrl={result.previewUrl}
          originalSize={result.originalSize}
          compressedSize={result.compressedSize}
          fileName={result.file.name}
          onRemove={handleRemove}
          disabled={disabled}
        />
      )}

      {/* 5. Initial capture trigger */}
      {!result && !isCompressing && !isUploadInProgress && (
        <ImageUploadTrigger
          onFileSelected={handleFileSelected}
          disabled={disabled}
        />
      )}

      {/* 6. Graceful degradation fallback modal (Issue 5.6) */}
      <UploadFallbackModal
        isOpen={effectiveFallbackOpen}
        fileName={result?.file.name}
        attempts={uploadAttempts}
        errorMessage={uploadError}
        onDiscardAndContinue={handleFallbackDiscard}
        onRetry={handleFallbackRetry}
        onClose={() => setIsFallbackOpen(false)}
      />
    </div>
  );
}

