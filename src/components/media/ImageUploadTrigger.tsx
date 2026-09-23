"use client";

import { Camera, ImagePlus, UploadCloud } from "lucide-react";
import { type DragEvent, useRef, useState } from "react";

import { Button } from "@/components/common/Button";

export interface ImageUploadTriggerProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Mobile-first media upload trigger supporting:
 * 1. Native rear camera capture via `capture="environment"`
 * 2. System photo gallery selection via `accept="image/png,image/jpeg,image/webp"`
 * 3. Desktop drag & drop fallback zone
 *
 * Adheres strictly to the Crimson Heritage Design System.
 */
export function ImageUploadTrigger({
  onFileSelected,
  disabled = false,
  className = "",
}: ImageUploadTriggerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processSelectedFile = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("El archivo seleccionado no es una imagen válida (formatos permitidos: JPG, PNG, WebP).");
      return;
    }

    setErrorMessage(null);
    onFileSelected(file);
  };

  const handleCameraChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    processSelectedFile(file);
  };

  const handleGalleryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    processSelectedFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled && !isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Only deactivate if leaving the container itself
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = event.dataTransfer.files?.[0];
    processSelectedFile(file);
  };

  return (
    <div
      role="region"
      aria-label="Zona para adjuntar evidencia fotográfica"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center shadow-sm transition-all duration-200 sm:p-6",
        isDragging
          ? "border-primary bg-secondary/10 ring-2 ring-primary/20"
          : "border-gray-200 bg-white/60 hover:border-secondary/40",
        disabled ? "opacity-60 cursor-not-allowed" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Hidden native inputs triggered programmatically */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={handleCameraChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={handleGalleryChange}
      />

      {/* Decorative Icon */}
      <div
        aria-hidden="true"
        className={[
          "mb-3 flex size-12 items-center justify-center rounded-2xl transition-colors",
          isDragging ? "bg-primary text-white" : "bg-secondary/10 text-primary",
        ].join(" ")}
      >
        <UploadCloud className="size-6" />
      </div>

      {/* Header and instructive subtext */}
      <h3 className="font-sans text-base font-semibold text-primary">
        Adjuntar evidencia visual (opcional)
      </h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-gray sm:text-sm">
        Máximo 1 foto. La imagen se optimizará automáticamente antes de enviarse.
      </p>

      {/* Dual action buttons */}
      <div className="mt-4 flex w-full flex-col items-stretch justify-center gap-2.5 sm:w-auto sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          leftIcon={<Camera />}
          onClick={() => cameraInputRef.current?.click()}
          className="w-full sm:w-auto"
        >
          Tomar foto
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          leftIcon={<ImagePlus className="text-primary" />}
          onClick={() => galleryInputRef.current?.click()}
          className="w-full border border-secondary/25 bg-secondary/5 text-primary hover:bg-secondary/15 sm:w-auto"
        >
          Galería
        </Button>
      </div>

      {/* Drag & drop desktop reminder */}
      <p aria-hidden="true" className="mt-3 hidden text-xs text-neutral-gray/80 sm:block">
        o arrastra y suelta tu archivo aquí
      </p>

      {/* Error notification if non-image file is chosen */}
      {errorMessage && (
        <p
          role="alert"
          className="mt-3 text-xs font-medium text-primary animate-fade-in"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
