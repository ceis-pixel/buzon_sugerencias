"use client";

import { ExternalLink, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface EvidenceLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  ticketCode: string;
}

const ZOOM_LEVELS = [1, 2, 3] as const;

const toolButtonClasses =
  "flex size-11 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 motion-reduce:transition-none";

/**
 * Full-screen evidence viewer with stepped zoom. It is a native modal dialog,
 * so it stacks above the inspection drawer and Escape closes it first.
 * The photograph keeps its aspect ratio at every zoom level.
 */
export function EvidenceLightbox({ isOpen, onClose, imageUrl, ticketCode }: EvidenceLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [zoomIndex, setZoomIndex] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleClose = () => {
    setZoomIndex(0);
    onClose();
  };

  const zoom = ZOOM_LEVELS[zoomIndex];
  const isZoomed = zoom > 1;

  return (
    <div className="contents">
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-label={`Evidencia fotográfica del ticket ${ticketCode}`}
        onCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleClose();
        }}
        onClose={(event) => {
          if (isOpen && !event.currentTarget.open) handleClose();
        }}
        className="fixed inset-0 m-0 h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] flex-col bg-black/95 p-0 text-white backdrop:bg-black open:flex"
      >
        {isOpen && (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2 sm:px-4">
              <span className="min-w-0 truncate font-mono text-xs font-semibold text-white/80">
                {ticketCode} · {zoom}×
              </span>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
                  disabled={zoomIndex === 0}
                  aria-label="Alejar"
                  className={toolButtonClasses}
                >
                  <ZoomOut aria-hidden="true" className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomIndex((index) => Math.min(ZOOM_LEVELS.length - 1, index + 1))}
                  disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                  aria-label="Acercar"
                  className={toolButtonClasses}
                >
                  <ZoomIn aria-hidden="true" className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomIndex(0)}
                  disabled={!isZoomed}
                  aria-label="Ajustar a la pantalla"
                  className={toolButtonClasses}
                >
                  <RotateCcw aria-hidden="true" className="size-5" />
                </button>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir el archivo original en una pestaña nueva"
                  className={toolButtonClasses}
                >
                  <ExternalLink aria-hidden="true" className="size-5" />
                </a>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Cerrar visor"
                  className={toolButtonClasses}
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>
            </div>

            <div
              className={`min-h-0 flex-1 overflow-auto overscroll-contain p-2 sm:p-4 ${
                isZoomed ? "" : "flex items-center justify-center"
              }`}
            >
              <Image
                src={imageUrl}
                alt={`Evidencia fotográfica del ticket ${ticketCode}`}
                width={1200}
                height={900}
                unoptimized
                onClick={() => setZoomIndex((index) => (index === 0 ? 1 : 0))}
                style={isZoomed ? { width: `${zoom * 100}%` } : undefined}
                className={
                  isZoomed
                    ? "h-auto max-w-none cursor-zoom-out"
                    : "h-auto max-h-full w-auto max-w-full cursor-zoom-in object-contain"
                }
              />
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
