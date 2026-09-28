"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { ImageAttachmentField } from "@/components/media/ImageAttachmentField";
import { CategorySelector } from "@/components/suggestion/CategorySelector";
import {
  getCurrentShift,
  getShiftLabel,
  ShiftSelector,
} from "@/components/suggestion/ShiftSelector";
import { SuggestionMessageField } from "@/components/suggestion/SuggestionMessageField";
import { useSuggestionDraft } from "@/lib/hooks/useSuggestionDraft";
import {
  suggestionFormSchema,
  type SuggestionFormValues,
} from "@/lib/validations/suggestionSchema";
import type { ShiftType, SuggestionCategory } from "@/types/database.types";

export interface SuggestionFormProps {
  /** Optional custom submission handler. Receives validated Zod values. */
  onSubmit?: (values: SuggestionFormValues) => Promise<void> | void;
  /** Optional callback invoked after successful submission. */
  onSuccess?: (values: SuggestionFormValues) => void;
  /** Default meal shift. Defaults to smart current shift. */
  defaultShift?: ShiftType;
  className?: string;
}

const shiftToDraftTurn: Record<ShiftType, "desayuno" | "almuerzo" | "cena"> = {
  breakfast: "desayuno",
  lunch: "almuerzo",
  dinner: "cena",
};

const draftTurnToShift: Record<string, ShiftType> = {
  desayuno: "breakfast",
  almuerzo: "lunch",
  cena: "dinner",
};

export function SuggestionForm({
  onSubmit,
  onSuccess,
  defaultShift,
  className = "",
}: SuggestionFormProps) {
  const { draft, hasDraft, updateDraft, clearDraft } = useSuggestionDraft();
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedValues, setSubmittedValues] = useState<SuggestionFormValues | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initial shift preference: defaultShift -> draft turn -> smart current shift
  const initialShift =
    defaultShift ??
    (draft.turn && draftTurnToShift[draft.turn]
      ? draftTurnToShift[draft.turn]
      : getCurrentShift());

  const initialCategory = (draft.category as SuggestionCategory) || undefined;
  const initialMessage = draft.text || "";

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SuggestionFormValues>({
    resolver: zodResolver(suggestionFormSchema),
    defaultValues: {
      shift: initialShift,
      category: initialCategory,
      message: initialMessage,
      mediaFile: null,
    },
    mode: "onTouched",
  });

  const currentShift = useWatch({ control, name: "shift" });
  const currentCategory = useWatch({ control, name: "category" });
  const currentMessage = useWatch({ control, name: "message" });

  // Keep ephemeral sessionStorage draft synchronized with active form fields
  useEffect(() => {
    if (!submissionSuccess) {
      updateDraft({
        text: currentMessage || "",
        turn: currentShift ? shiftToDraftTurn[currentShift] : "",
        category: currentCategory || "",
      });
    }
  }, [currentMessage, currentShift, currentCategory, submissionSuccess, updateDraft]);

  const handleFormSubmit = async (values: SuggestionFormValues) => {
    setSubmitError(null);
    try {
      if (onSubmit) {
        await onSubmit(values);
      } else {
        // Default simulated submission (for showcase & demonstration)
        await new Promise((resolve) => setTimeout(resolve, 800));
        console.log("✓ Sugerencia validada con Zod lista para envío:", values);
      }

      clearDraft();
      setSubmittedValues(values);
      setSubmissionSuccess(true);
      onSuccess?.(values);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al enviar la sugerencia. Por favor intenta de nuevo.";
      setSubmitError(msg);
    }
  };

  const handleStartNewSuggestion = () => {
    clearDraft();
    reset({
      shift: getCurrentShift(),
      category: undefined,
      message: "",
      mediaFile: null,
    });
    setSubmittedValues(null);
    setSubmissionSuccess(false);
    setSubmitError(null);
  };

  // ─── Success View State ──────────────────────────────────────────────────
  if (submissionSuccess && submittedValues) {
    return (
      <Card
        variant="default"
        padding="none"
        className={`overflow-hidden border-emerald-200 bg-white ${className}`}
      >
        <div className="bg-emerald-50/70 p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
            <CheckCircle2 className="size-8" aria-hidden="true" />
          </div>
          <Badge variant="success" size="md" className="mb-2">
            Envío confirmado
          </Badge>
          <CardTitle as="h2" className="text-2xl text-gray-900">
            ¡Sugerencia Registrada con Éxito!
          </CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-gray leading-relaxed">
            Tu observación para el turno de{" "}
            <span className="font-bold text-gray-900">
              {getShiftLabel(submittedValues.shift)}
            </span>{" "}
            ha sido recibida y registrada de forma anónima para su análisis por la administración
            del comedor universitario.
          </p>
        </div>

        <CardFooter className="flex justify-center bg-gray-50/50 p-6">
          <Button
            type="button"
            variant="primary"
            leftIcon={<RotateCcw className="size-4" />}
            onClick={handleStartNewSuggestion}
          >
            Enviar otra observación
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ─── Active Form View ────────────────────────────────────────────────────
  return (
    <Card
      variant="default"
      padding="none"
      className={`overflow-hidden border border-gray-100 shadow-sm ${className}`}
    >
      {/* Header with Didactic Anonymity Reminder */}
      <CardHeader className="flex-col items-start gap-2 border-b border-gray-100 bg-slate-50/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="tertiary"
            size="sm"
            icon={<ShieldCheck className="size-3.5" />}
          >
            100% Anónimo
          </Badge>
          <Badge variant="secondary" size="sm" icon={<Sparkles className="size-3.5" />}>
            Comedor Universitario UNSCH
          </Badge>
        </div>

        <CardTitle as="h2" className="text-xl sm:text-2xl text-primary font-bold">
          Buzón de Sugerencias y Reclamos
        </CardTitle>

        <CardDescription className="max-w-2xl text-sm leading-relaxed text-neutral-gray">
          Tu identidad se mantiene 100% en reserva. La información se procesa de forma anónima
          para garantizar una atención justa y mejorar continuamente el servicio alimentario.
        </CardDescription>

        {/* Ephemeral Draft Restored Banner */}
        {hasDraft && draft.text && (
          <div className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-tertiary/20 bg-tertiary/5 px-3 py-2 text-xs text-tertiary">
            <span>Se ha recuperado tu borrador guardado en este navegador.</span>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                reset({
                  shift: getCurrentShift(),
                  category: undefined,
                  message: "",
                  mediaFile: null,
                });
              }}
              className="font-bold underline hover:opacity-80"
            >
              Descartar
            </button>
          </div>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <CardContent className="space-y-6 p-5 sm:p-6">
          {/* Global Submit Error Banner */}
          {submitError && (
            <AlertBanner
              variant="error"
              title="No pudimos procesar tu sugerencia"
              description={submitError}
            />
          )}

          {/* Section 1: Shift Selector (Issue 6.1) */}
          <section aria-labelledby="form-shift-title" className="space-y-2">
            <div className="flex items-center justify-between">
              <h3
                id="form-shift-title"
                className="text-xs font-bold uppercase tracking-wider text-neutral-gray"
              >
                1. Turno de atención <span className="text-primary">*</span>
              </h3>
              <span className="text-[11px] text-neutral-gray">Detección inteligente</span>
            </div>

            <Controller
              name="shift"
              control={control}
              render={({ field }) => (
                <ShiftSelector
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.shift && (
              <p role="alert" className="text-xs font-semibold text-primary">
                {errors.shift.message}
              </p>
            )}
          </section>

          {/* Section 2: Category Selector (Issue 6.2) */}
          <section aria-labelledby="form-category-title" className="space-y-2">
            <div className="flex items-center justify-between">
              <h3
                id="form-category-title"
                className="text-xs font-bold uppercase tracking-wider text-neutral-gray"
              >
                2. Categoría de la observación <span className="text-primary">*</span>
              </h3>
              <span className="text-[11px] text-neutral-gray">Toca una opción</span>
            </div>

            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <CategorySelector
                  value={field.value ?? null}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  errorMessage={errors.category?.message}
                />
              )}
            />
          </section>

          {/* Section 3: Suggestion Message with Character Counter (Issue 6.3) */}
          <section aria-labelledby="form-message-title" className="space-y-2">
            <SuggestionMessageField
              {...register("message")}
              value={currentMessage}
              required
              disabled={isSubmitting}
              errorMessage={errors.message?.message}
            />
          </section>

          {/* Section 4: Image Attachment Field (Sprint 5) */}
          <section aria-labelledby="form-media-title" className="space-y-2">
            <div className="flex items-center justify-between">
              <h3
                id="form-media-title"
                className="text-xs font-bold uppercase tracking-wider text-neutral-gray"
              >
                4. Evidencia fotográfica (opcional)
              </h3>
              <span className="text-[11px] text-neutral-gray">Máx. 1 foto</span>
            </div>

            <Controller
              name="mediaFile"
              control={control}
              render={({ field }) => (
                <ImageAttachmentField
                  value={field.value ?? null}
                  onChange={(file) => {
                    setValue("mediaFile", file, { shouldValidate: true });
                  }}
                  disabled={isSubmitting}
                />
              )}
            />
          </section>
        </CardContent>

        {/* Submit Action Footer */}
        <CardFooter
          withBorder
          className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50/50 p-5 sm:p-6"
        >
          <p className="text-xs text-neutral-gray">
            Al enviar, confirmas que la información corresponde a tu experiencia personal.
          </p>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            leftIcon={<Send className="size-4" />}
            className="w-full sm:w-auto"
          >
            Enviar Sugerencia Anónima
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
