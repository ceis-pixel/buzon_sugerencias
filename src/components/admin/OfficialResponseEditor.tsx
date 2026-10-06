"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Clock, Eye, Send, Zap } from "lucide-react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { Button } from "@/components/common/Button";
import { saveOfficialResponse } from "@/lib/actions/adminActions";
import { formatPeruvianDateTime } from "@/lib/utils/exportReport";
import { officialResponseSchema } from "@/lib/validations/responseSchema";
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

type ResponseStatus = "in_review" | "resolved";

interface ResponseFormValues {
  suggestionId: string;
  responseText: string;
}

const MAX_LENGTH = 600;

/** One-click institutional answers the JVC issues most often. */
export const CANNED_RESPONSES: readonly { label: string; text: string }[] = [
  {
    label: "Porción",
    text: "Observación comunicada a los concesionarios para corregir la porción del turno.",
  },
  {
    label: "Higiene",
    text: "Se realizó la inspección higiénica en cocina y se aplicaron las medidas correctivas.",
  },
  {
    label: "Menaje",
    text: "Derivado a la administración de Bienestar Universitario para reposición de menaje.",
  },
];

const STATUS_CHOICES: readonly {
  value: ResponseStatus;
  label: string;
  hint: string;
  icon: typeof Eye;
  selectedTone: string;
}[] = [
  {
    value: "in_review",
    label: "En Revisión",
    hint: "Respuesta provisional. Visible en el seguimiento del ticket.",
    icon: Eye,
    selectedTone: "border-tertiary bg-tertiary/10 text-tertiary",
  },
  {
    value: "resolved",
    label: "Atendido",
    hint: "Cierra el caso. Visible en el seguimiento y en el mural de transparencia.",
    icon: CheckCircle2,
    selectedTone: "border-emerald-500 bg-emerald-50 text-emerald-900",
  },
];

/**
 * Official response editor for the JVC:
 * - Canned responses that fill the text in one click.
 * - React Hook Form + Zod validation (15 to 600 characters) with a live counter.
 *   The server strips markup before storing the text.
 * - Target status selector: `in_review` (provisional) or `resolved`.
 */
export function OfficialResponseEditor({
  suggestionId,
  ticketCode,
  existingResponse,
  onResponseSaved,
}: OfficialResponseEditorProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<ResponseStatus>("resolved");

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ResponseFormValues>({
    resolver: zodResolver(officialResponseSchema.omit({ status: true })),
    defaultValues: {
      suggestionId,
      responseText: existingResponse?.response_text ?? "",
    },
  });

  const responseText = useWatch({ control, name: "responseText" }) ?? "";
  const charCount = responseText.trim().length;

  const applyCannedResponse = (text: string) => {
    setValue("responseText", text, { shouldDirty: true, shouldValidate: true });
    setSuccessMessage(null);
    setFocus("responseText");
  };

  const onSubmit = async (data: ResponseFormValues) => {
    setServerError(null);
    setSuccessMessage(null);

    const result = await saveOfficialResponse({ ...data, status: targetStatus });

    if (!result.success || !result.data) {
      setServerError(
        result.error ||
          "No fue posible guardar la respuesta oficial. Por favor intenta de nuevo.",
      );
      return;
    }

    setSuccessMessage(
      targetStatus === "resolved"
        ? "Respuesta publicada. El reporte quedó como «Atendido» y ya es visible en el seguimiento y en el mural de transparencia."
        : "Respuesta publicada. El reporte quedó «En Revisión» y ya es visible en el seguimiento del ticket.",
    );
    onResponseSaved(result.data.response, result.data.suggestion);
  };

  return (
    <section aria-labelledby="official-response-title" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="official-response-title" className="text-sm font-bold text-gray-900">
            Respuesta oficial de la JVC
          </h3>
          <p className="text-xs text-neutral-gray">
            La verá el estudiante al consultar el ticket {ticketCode}.
          </p>
        </div>
        {existingResponse && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 aria-hidden="true" className="size-3" />
            Ya respondido
          </span>
        )}
      </div>

      {existingResponse && (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg border border-neutral-gray/20 bg-white px-3 py-2 text-[11px] text-neutral-gray">
          <Clock aria-hidden="true" className="size-3 shrink-0" />
          Última edición: {formatPeruvianDateTime(existingResponse.updated_at ?? existingResponse.created_at)}
          <span aria-hidden="true">·</span>
          <span className="break-all font-mono font-medium text-primary">
            {existingResponse.responder_email}
          </span>
        </p>
      )}

      {/* Canned responses */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          <Zap aria-hidden="true" className="size-3.5 text-secondary" />
          Plantillas de respuesta rápida
        </p>
        <div className="flex flex-col gap-1.5">
          {CANNED_RESPONSES.map((canned) => (
            <button
              key={canned.label}
              type="button"
              onClick={() => applyCannedResponse(canned.text)}
              className="min-h-11 rounded-xl border border-neutral-gray/25 bg-white px-3 py-2 text-left text-xs leading-snug text-gray-800 transition-colors hover:border-secondary/60 hover:bg-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="mr-1.5 font-bold text-secondary">{canned.label}:</span>
              {canned.text}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <input type="hidden" {...register("suggestionId")} />

        <div className="space-y-1.5">
          <label
            htmlFor="official-response-text"
            className="block text-xs font-semibold text-gray-700"
          >
            Detalle de la respuesta o medidas adoptadas
          </label>
          <textarea
            id="official-response-text"
            rows={5}
            maxLength={MAX_LENGTH}
            placeholder="Describe la verificación realizada y la medida adoptada por la JVC."
            aria-invalid={Boolean(errors.responseText)}
            aria-describedby="official-response-help"
            {...register("responseText")}
            className={`block w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-sm leading-relaxed text-gray-900 shadow-sm placeholder:text-neutral-gray/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              errors.responseText ? "border-primary" : "border-neutral-gray/30"
            }`}
          />

          <div id="official-response-help" className="flex items-start justify-between gap-3 text-xs">
            {errors.responseText ? (
              <span role="alert" className="flex items-center gap-1 font-medium text-primary">
                <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
                {errors.responseText.message}
              </span>
            ) : (
              <span className="text-neutral-gray">
                Entre 15 y {MAX_LENGTH} caracteres. Se guarda como texto plano.
              </span>
            )}
            <span
              className={`shrink-0 tabular-nums ${
                charCount > MAX_LENGTH - 50 ? "font-bold text-amber-700" : "text-neutral-gray"
              }`}
            >
              {charCount}/{MAX_LENGTH}
            </span>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-gray-700">
            Estado del reporte al publicar
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_CHOICES.map((choice) => {
              const Icon = choice.icon;
              const isSelected = targetStatus === choice.value;
              return (
                <label
                  key={choice.value}
                  className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 ${
                    isSelected
                      ? choice.selectedTone
                      : "border-neutral-gray/20 bg-white text-gray-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="response-target-status"
                    value={choice.value}
                    checked={isSelected}
                    onChange={() => setTargetStatus(choice.value)}
                    className="sr-only"
                  />
                  <Icon aria-hidden="true" className="size-3.5" />
                  {choice.label}
                </label>
              );
            })}
          </div>
          <p className="text-[11px] text-neutral-gray">
            {STATUS_CHOICES.find((choice) => choice.value === targetStatus)?.hint}
          </p>
        </fieldset>

        {serverError && (
          <AlertBanner
            variant="error"
            title="Error al guardar la respuesta"
            description={serverError}
          />
        )}

        {successMessage && (
          <AlertBanner variant="success" title="Respuesta guardada" description={successMessage} />
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          leftIcon={<Send className="size-4" />}
        >
          Publicar Respuesta Oficial
        </Button>
      </form>
    </section>
  );
}
