"use client";

import { CheckCircle2, FileImage, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/common/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/Card";
import { ImageUploadTrigger } from "@/components/media/ImageUploadTrigger";

interface SelectedFileInfo {
  name: string;
  sizeInBytes: number;
  sizeFormatted: string;
  type: string;
  previewUrl: string;
}

export function ImageUploadShowcase() {
  const [selectedFile, setSelectedFile] = useState<SelectedFileInfo | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    return () => {
      if (selectedFile?.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl);
      }
    };
  }, [selectedFile]);

  const handleFileSelected = (file: File) => {
    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }

    const sizeInMB = file.size / (1024 * 1024);
    const sizeFormatted =
      sizeInMB >= 0.1
        ? `${sizeInMB.toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

    const previewUrl = URL.createObjectURL(file);

    setSelectedFile({
      name: file.name,
      sizeInBytes: file.size,
      sizeFormatted,
      type: file.type || "Desconocido",
      previewUrl,
    });
  };

  const handleDiscard = () => {
    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }
    setSelectedFile(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle>Captura y Selección de Evidencia Visual</CardTitle>
          <CardDescription>
            Componente adaptado para cámara física móvil (`capture=&quot;environment&quot;`), galería y drag &amp; drop.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Toggle to test disabled state */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-neutral-gray cursor-pointer">
            <input
              type="checkbox"
              checked={isDisabled}
              onChange={(e) => setIsDisabled(e.target.checked)}
              className="size-4 accent-primary rounded"
            />
            Simular estado inhabilitado (subiendo o procesando)
          </label>
        </div>

        {/* The Trigger Component */}
        <ImageUploadTrigger
          onFileSelected={handleFileSelected}
          disabled={isDisabled}
        />

        {/* Selected file card inspector */}
        {selectedFile && (
          <div
            role="status"
            className="rounded-2xl border border-secondary/30 bg-secondary/5 p-4 sm:p-5 transition-all animate-fade-in"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-secondary/20 bg-white shadow-sm">
                  {selectedFile.previewUrl ? (
                    <Image
                      src={selectedFile.previewUrl}
                      alt="Vista previa de evidencia"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-secondary">
                      <FileImage className="size-6" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-primary">
                    <CheckCircle2 className="size-4 shrink-0 text-secondary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                      Archivo seleccionado
                    </span>
                  </div>
                  <p className="truncate font-sans text-sm font-bold text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-neutral-gray">
                    <span className="font-semibold text-gray-700">{selectedFile.sizeFormatted}</span>
                    {" • "}
                    <span>{selectedFile.type}</span>
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="size-4 text-primary" />}
                onClick={handleDiscard}
                className="self-end sm:self-center border border-primary/20 text-primary hover:bg-primary/10"
              >
                Descartar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
