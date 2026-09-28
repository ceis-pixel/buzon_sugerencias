"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
} from "lucide-react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { Button } from "@/components/common/Button";
import { saveOfficialResponse } from "@/lib/actions/adminActions";
import { formatPeruvianDateTime } from "@/lib/utils/exportReport";
import {
  officialResponseSchema,
  type OfficialResponseInput,
} from "@/lib/validations/responseSchema";
import type { SuggestionRow, TicketResponseRow } from "@/types/database.types";

export interface OfficialResponseEditorProps {
  suggestionId: string;
  ticketCode: string;
  existingResponse?: TicketResponseRow | null;
  onResponseSaved: (
    savedResponse: TicketResponseRow,
    updatedSuggestion: SuggestionRow,
  ) => void;
}

/**
 * Issue 8.5 — OfficialResponseEditor
 *
 * Structured editor for official FUSCH responses to student feedback:
 * - Integrated with React Hook Form + Zod (15 to 600 characters).
 * - Real-time character counter and validation feedback.
 * - Displays previous response metadata (responder email + Peruvian timestamp).
 * - On save, automatically updates ticket status to 'resolved' and syncs with public tracking.
 */
export function OfficialResponseEditor({
  suggestionId,
  ticketCode,
  existingResponse,
  onResponseSaved,
}: OfficialResponseEditorProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [responseText, setResponseText] = useState(
    existingResponse?.response_text ?? "",
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OfficialResponseInput>({
    resolver: zodResolver(officialResponseSchema),
    defaultValues: {
      suggestionId,
      responseText: existingResponse?.response_text ?? "",
    },
  });

  const charCount = responseText.trim().length;

  const { onChange: formOnChange, ...restRegister } = register("responseText");

  const onSubmit = async (data: OfficialResponseInput) => {
    setServerError(null);
    setSuccessMessage(null);

    const result = await saveOfficialResponse(data);

    if (!result.success || !result.data) {
      setServerError(
        result.error ||
          "No fue posible guardar la respuesta oficial. Por favor intenta de nuevo.",
      );
      return;
    }

    setSuccessMessage(
      "Respuesta institucional guardada exitosamente. El ticket ha sido marcado como «Atendido».",
    );
    onResponseSaved(result.data.response, result.data.suggestion);
  };

  return (
    <div className="rounded-xl border border-neutral-gray/25 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-neutral-gray/15 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Respuesta Oficial de la Comisión (FUSCH)
            </h3>
            <p className="text-xs text-neutral-gray">
              Visible para el estudiante al consultar el ticket #{ticketCode}
            </p>
          </div>
        </div>

        {existingResponse && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            Ya respondido
          </span>
        )}
      </div>

      {/* Existing response metadata note */}
      {existingResponse && (
        <div className="mt-3 rounded-lg border border-neutral-gray/20 bg-white p-3 text-xs text-neutral-gray space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800">
              Última respuesta registrada por:
            </span>
            <span className="font-mono text-primary font-medium">
              {existingResponse.responder_email}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <Clock className="h-3 w-3 text-neutral-gray" />
            <span>
              Registrado el{" "}
              {formatPeruvianDateTime(existingResponse.created_at)}
            </span>
          </div>
        </div>
      )}

      {/* Response Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
        <input type="hidden" {...register("suggestionId")} value={suggestionId} />

        <div className="space-y-1.5">
          <label
            htmlFor="official-response-text"
            className="block text-xs font-semibold text-gray-700"
          >
            Detalle de la respuesta o medidas adoptadas:
          </label>
          <textarea
            id="official-response-text"
            rows={4}
            maxLength={600}
            placeholder="Estimado(a) estudiante: Agradecemos tu observación. La Comisión de Salud y Nutrición de la FUSCH inspeccionó el comedor y coordinó con el concesionario para..."
            value={responseText}
            {...restRegister}
            onChange={(e) => {
              setResponseText(e.target.value);
              formOnChange(e);
            }}
            className={`block w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-neutral-gray/60 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 ${
              errors.responseText ? "border-primary" : "border-neutral-gray/30"
            }`}
          />

          <div className="flex items-center justify-between text-xs">
            {errors.responseText ? (
              <span className="font-medium text-primary flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.responseText.message}
              </span>
            ) : (
              <span className="text-neutral-gray/80">
                Mínimo 15 caracteres significativos
              </span>
            )}
            <span
              className={`font-mono text-xs ${
                charCount > 550 ? "text-amber-700 font-bold" : "text-neutral-gray"
              }`}
            >
              {charCount}/600 caracteres
            </span>
          </div>
        </div>

        {/* Server Feedback Banners */}
        {serverError && (
          <AlertBanner
            variant="error"
            title="Error al guardar la respuesta"
            description={serverError}
          />
        )}

        {successMessage && (
          <AlertBanner
            variant="success"
            title="Respuesta guardada"
            description={successMessage}
          />
        )}

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-neutral-gray italic">
            * Guardar esta respuesta marcará automáticamente la sugerencia como{" "}
            <strong className="text-emerald-700">Atendida</strong>.
          </p>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Send className="h-3.5 w-3.5" />}
            className="w-full sm:w-auto"
          >
            {existingResponse
              ? "Actualizar Respuesta Oficial"
              : "Publicar Respuesta Oficial"}
          </Button>
        </div>
      </form>
    </div>
  );
}
