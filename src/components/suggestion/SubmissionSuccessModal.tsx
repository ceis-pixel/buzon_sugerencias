"use client";

import { useState } from "react";
import { Check, CheckCircle2, Copy, ExternalLink, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { getCategoryLabel } from "@/components/suggestion/CategorySelector";
import { getShiftLabel } from "@/components/suggestion/ShiftSelector";
import { copyToClipboard } from "@/lib/utils/clipboard";
import type { ShiftType, SuggestionCategory } from "@/types/database.types";

export interface SubmissionSuccessModalProps {
  isOpen: boolean;
  ticketCode: string;
  shift: ShiftType;
  category: SuggestionCategory;
  onClose: () => void;
}

export function SubmissionSuccessModal({
  isOpen,
  ticketCode,
  shift,
  category,
  onClose,
}: SubmissionSuccessModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const isCopied = isOpen && copiedCode === ticketCode;

  const handleCopyCode = async () => {
    const success = await copyToClipboard(ticketCode);
    if (success) {
      setCopiedCode(ticketCode);
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    }
  };

  const shiftLabel = getShiftLabel(shift);
  const categoryLabel = getCategoryLabel(category);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cerrar y volver
          </Button>

          <Button
            as="a"
            href={`/seguimiento?code=${encodeURIComponent(ticketCode)}`}
            variant="primary"
            size="md"
            rightIcon={<ExternalLink className="size-4" />}
            className="w-full sm:w-auto"
          >
            Consultar estado
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-center">
        {/* Visual Distinctive Header */}
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <Badge
              variant="tertiary"
              size="sm"
              icon={<ShieldCheck className="size-3" />}
            >
              Envío 100% Anónimo
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            ¡Sugerencia registrada con éxito!
          </h2>
          <p className="text-xs sm:text-sm text-neutral-gray leading-relaxed max-w-sm mx-auto">
            Tu reporte fue enviado de manera anónima y ya está disponible para revisión de la
            comisión del comedor universitario.
          </p>
        </div>

        {/* Ticket Code Display Block */}
        <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50 p-4 sm:p-5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-gray mb-1.5">
            CÓDIGO DE SEGUIMIENTO ANÓNIMO
          </span>

          <div className="my-1.5 flex items-center justify-center">
            <span
              tabIndex={0}
              aria-label={`Código de ticket: ${ticketCode}`}
              className="select-all font-mono text-2xl sm:text-3xl font-extrabold tracking-wider text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded px-2 py-0.5"
            >
              {ticketCode}
            </span>
          </div>

          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant={isCopied ? "primary" : "secondary"}
              size="sm"
              leftIcon={
                isCopied ? (
                  <Check className="size-3.5 text-white" />
                ) : (
                  <Copy className="size-3.5" />
                )
              }
              onClick={handleCopyCode}
              aria-label={isCopied ? "Código copiado al portapapeles" : "Copiar código de ticket"}
              className="text-xs"
            >
              {isCopied ? "¡Código copiado!" : "Copiar código"}
            </Button>
          </div>
        </div>

        {/* Traceability Context & Instructions */}
        <div className="rounded-xl bg-gray-50/80 p-3.5 text-left text-xs text-neutral-gray space-y-1.5 border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
            <span className="font-semibold text-gray-800">
              Turno: <span className="text-primary">{shiftLabel}</span>
            </span>
            <span className="font-semibold text-gray-800">
              Categoría: <span className="text-primary">{categoryLabel}</span>
            </span>
          </div>
          <p className="leading-relaxed">
            <span className="font-semibold text-gray-900">Guarda este código.</span> Con él
            podrás verificar la respuesta de la Secretaría del comedor en la sección de
            seguimiento sin revelar tu identidad.
          </p>
        </div>
      </div>
    </Modal>
  );
}
