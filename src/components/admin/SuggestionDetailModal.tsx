"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Maximize2,
  X,
  ZoomIn,
} from "lucide-react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { ShiftBadge } from "@/components/common/ShiftBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getCategoryLabel } from "@/components/suggestion/CategorySelector";
import { OfficialResponseEditor } from "@/components/admin/OfficialResponseEditor";
import { updateSuggestionStatus } from "@/lib/actions/adminActions";
import { formatPeruvianDateTime } from "@/lib/utils/exportReport";
import type {
  SuggestionRow,
  TicketResponseRow,
  TicketStatus,
} from "@/types/database.types";

export interface SuggestionWithResponse extends SuggestionRow {
  latest_response?: TicketResponseRow | null;
  responses?: TicketResponseRow[];
}

export interface SuggestionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: SuggestionWithResponse | null;
  onStatusChange?: (
    suggestionId: string,
    newStatus: TicketStatus,
    updatedRow: SuggestionRow,
  ) => void;
  onResponseSaved?: (
    savedResponse: TicketResponseRow,
    updatedSuggestion: SuggestionRow,
  ) => void;
}

/**
 * Issue 8.4 & 8.5 — SuggestionDetailModal
 *
 * Full administration dialog exposing complete suggestion details:
 * - Ticket code, precise Peruvian timestamp, shift badge and category label.
 * - Complete untruncated message in high readability box.
 * - Photographic evidence viewer with zoom capability.
 * - Quick action status transition bar (Pending, In Review, Resolved) with optimistic update.
 * - Official response editor integration (Issue 8.5) for FUSCH moderation.
 */
export function SuggestionDetailModal({
  isOpen,
  onClose,
  suggestion,
  onStatusChange,
  onResponseSaved,
}: SuggestionDetailModalProps) {
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(
    suggestion?.status ?? "pending",
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

  // Sync internal state when opened with a new suggestion
  if (suggestion && suggestion.status !== currentStatus && !isUpdatingStatus) {
    setCurrentStatus(suggestion.status);
  }

  if (!suggestion) return null;

  const handleStatusTransition = async (newStatus: TicketStatus) => {
    if (newStatus === currentStatus || isUpdatingStatus) return;

    setStatusError(null);
    const previousStatus = currentStatus;

    // Optimistic UI update
    setCurrentStatus(newStatus);
    setIsUpdatingStatus(true);

    try {
      const result = await updateSuggestionStatus(suggestion.id, newStatus);
      if (!result.success || !result.data) {
        // Revert optimistic update on failure
        setCurrentStatus(previousStatus);
        setStatusError(
          result.error || "No se pudo actualizar el estado del ticket.",
        );
      } else {
        onStatusChange?.(suggestion.id, newStatus, result.data);
      }
    } catch {
      setCurrentStatus(previousStatus);
      setStatusError("Ocurrió un error inesperado al actualizar el estado.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOfficialResponseSaved = (
    savedResponse: TicketResponseRow,
    updatedSuggestion: SuggestionRow,
  ) => {
    setCurrentStatus("resolved");
    onStatusChange?.(suggestion.id, "resolved", updatedSuggestion);
    onResponseSaved?.(savedResponse, updatedSuggestion);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={`Ticket #${suggestion.ticket_code ?? "S/C"}`}
        description={`Registrado el ${formatPeruvianDateTime(suggestion.created_at)}`}
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-neutral-gray">
              Identificador interno:{" "}
              <code className="font-mono text-[11px]">{suggestion.id.slice(0, 8)}</code>
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cerrar Detalle
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Header Metadata Chips */}
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-gray/15 pb-4">
            <ShiftBadge shift={suggestion.shift} />
            <Badge variant="outline" size="sm">
              {getCategoryLabel(suggestion.category)}
            </Badge>
            <StatusBadge status={currentStatus} />
          </div>

          {/* Status Transition Control Bar */}
          <div className="rounded-xl border border-neutral-gray/25 bg-slate-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-gray">
                Cambiar Estado Operativo:
              </span>
              {isUpdatingStatus && (
                <span className="text-xs font-semibold text-primary animate-pulse">
                  Actualizando estado…
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option: Pendiente */}
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => handleStatusTransition("pending")}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                  currentStatus === "pending"
                    ? "bg-amber-100 text-amber-900 border-2 border-amber-400 shadow-xs"
                    : "bg-white text-gray-700 border border-neutral-gray/25 hover:bg-amber-50"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-amber-700" />
                <span>Pendiente</span>
              </button>

              {/* Option: En Revisión */}
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => handleStatusTransition("in_review")}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                  currentStatus === "in_review"
                    ? "bg-[#001586]/10 text-tertiary border-2 border-tertiary/60 shadow-xs"
                    : "bg-white text-gray-700 border border-neutral-gray/25 hover:bg-[#001586]/5"
                }`}
              >
                <Eye className="h-3.5 w-3.5 text-tertiary" />
                <span>En Revisión</span>
              </button>

              {/* Option: Atendido */}
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => handleStatusTransition("resolved")}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                  currentStatus === "resolved"
                    ? "bg-emerald-100 text-emerald-900 border-2 border-emerald-500 shadow-xs"
                    : "bg-white text-gray-700 border border-neutral-gray/25 hover:bg-emerald-50"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                <span>Atendido</span>
              </button>
            </div>

            {statusError && (
              <AlertBanner
                variant="error"
                description={statusError}
                onClose={() => setStatusError(null)}
              />
            )}
          </div>

          {/* Student Message Body */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
              <FileText className="h-4 w-4 text-primary" />
              <span>Mensaje del Estudiante (Original y sin disociar):</span>
            </div>
            <div className="rounded-xl border border-neutral-gray/20 bg-white p-4 shadow-xs">
              <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-900">
                {suggestion.message}
              </p>
            </div>
          </div>

          {/* Attached Photographic Evidence */}
          {suggestion.photo_url && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                <div className="flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-primary" />
                  <span>Evidencia Fotográfica Adjunta:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPhotoZoomed(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                  Ver ampliada
                </button>
              </div>

              <div
                onClick={() => setIsPhotoZoomed(true)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-neutral-gray/25 bg-slate-900/5 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="relative aspect-video w-full max-h-64 sm:max-h-72">
                  <Image
                    src={suggestion.photo_url}
                    alt={`Evidencia fotográfica para el ticket ${suggestion.ticket_code}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="object-contain"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-gray-900 shadow-md">
                    <Maximize2 className="h-4 w-4 text-primary" />
                    Pulsar para ampliar imagen
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Official FUSCH Response Section (Issue 8.5) */}
          <OfficialResponseEditor
            suggestionId={suggestion.id}
            ticketCode={suggestion.ticket_code ?? "S/C"}
            existingResponse={
              suggestion.latest_response ||
              (suggestion.responses && suggestion.responses.length > 0
                ? suggestion.responses[suggestion.responses.length - 1]
                : null)
            }
            onResponseSaved={handleOfficialResponseSaved}
          />
        </div>
      </Modal>

      {/* High-Resolution Zoom Modal */}
      {isPhotoZoomed && suggestion.photo_url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visor de evidencia ampliada"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsPhotoZoomed(false)}
        >
          <div
            className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close control */}
            <button
              type="button"
              onClick={() => setIsPhotoZoomed(false)}
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Cerrar visor de imagen"
            >
              <X className="h-6 w-6" />
            </button>

            {/* High-res image display */}
            <div className="relative max-h-[80vh] max-w-[85vw] overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl">
              <Image
                src={suggestion.photo_url}
                alt={`Evidencia ampliada para el ticket ${suggestion.ticket_code}`}
                width={1200}
                height={800}
                unoptimized
                className="max-h-[80vh] max-w-[85vw] object-contain"
              />
            </div>

            <div className="mt-3 flex items-center gap-3">
              <a
                href={suggestion.photo_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/30"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir archivo original en pestaña nueva
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
