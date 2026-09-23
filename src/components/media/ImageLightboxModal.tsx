"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

export interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText?: string;
  fileName?: string;
}

export function ImageLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  altText = "Fotografía ampliada",
  fileName,
}: ImageLightboxModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll while lightbox is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada de la fotografía adjunta"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in sm:p-6"
    >
      {/* Top action toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mb-3 flex w-full max-w-4xl items-center justify-between text-white"
      >
        <span className="truncate pr-4 text-xs font-medium text-white/80 sm:text-sm">
          {fileName || "Vista previa de evidencia"}
        </span>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar vista ampliada"
          className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Expanded image view */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] max-w-[90vw] items-center justify-center overflow-hidden rounded-2xl shadow-2xl"
      >
        <div className="relative max-h-[85vh] max-w-[90vw]">
          <Image
            src={imageUrl}
            alt={altText}
            width={1200}
            height={900}
            unoptimized
            className="max-h-[85vh] w-auto max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
