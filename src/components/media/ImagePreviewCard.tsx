"use client";

import { Eye, Maximize2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Badge } from "@/components/common/Badge";
import { ImageLightboxModal } from "@/components/media/ImageLightboxModal";

export interface ImagePreviewCardProps {
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  fileName?: string;
  onRemove: () => void;
  disabled?: boolean;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

export function ImagePreviewCard({
  previewUrl,
  originalSize,
  compressedSize,
  fileName = "fotografia_optimizada.webp",
  onRemove,
  disabled = false,
  className = "",
}: ImagePreviewCardProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const savingPercentage =
    originalSize > compressedSize && originalSize > 0
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
      : 0;

  return (
    <>
      <div
        className={[
          "relative flex items-center justify-between gap-3.5 rounded-2xl border border-neutral-gray/20 bg-white p-3.5 shadow-sm transition-all duration-200 sm:p-4",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          {/* Interactive thumbnail trigger */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            aria-label="Ampliar fotografía para verificar legibilidad"
            className="group relative size-20 shrink-0 overflow-hidden rounded-xl border border-secondary/20 bg-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:size-24 cursor-pointer"
          >
            <Image
              src={previewUrl}
              alt="Miniatura de fotografía adjunta"
              fill
              unoptimized
              className="object-cover transition-transform duration-200 group-hover:scale-105"
            />
            {/* Visual overlay on hover/focus */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
              <Maximize2 className="size-5" aria-hidden="true" />
            </div>
          </button>

          {/* Metadata & Optimization Chips */}
          <div className="min-w-0 space-y-1.5">
            <p
              title={fileName}
              className="truncate font-sans text-sm font-bold text-gray-900"
            >
              {fileName}
            </p>

            {/* Badges container */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" size="sm">
                WebP
              </Badge>

              <Badge variant="success" size="sm">
                {formatBytes(compressedSize)} {savingPercentage > 0 ? `(-${savingPercentage}%)` : ""}
              </Badge>
            </div>

            <p className="text-xs text-neutral-gray flex items-center gap-1">
              <span>Evidencia optimizada</span>
              <span className="hidden sm:inline">•</span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="hidden sm:inline-flex items-center gap-0.5 text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-80"
              >
                <Eye className="size-3" aria-hidden="true" />
                <span>Ver completa</span>
              </button>
            </p>
          </div>
        </div>

        {/* Accessible discard button */}
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Eliminar fotografía adjunta"
          className={[
            "flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-neutral-gray transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95 motion-reduce:transition-none",
            disabled ? "pointer-events-none opacity-40 cursor-not-allowed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Lightbox modal */}
      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        imageUrl={previewUrl}
        fileName={fileName}
      />
    </>
  );
}
