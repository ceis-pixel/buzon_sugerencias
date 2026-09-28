"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
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
  ShiftSelector,
} from "@/components/suggestion/ShiftSelector";
import {
  SubmissionLoadingState,
  type SubmissionStage,
} from "@/components/suggestion/SubmissionLoadingState";
import { SubmissionSuccessModal } from "@/components/suggestion/SubmissionSuccessModal";
import { SuggestionMessageField } from "@/components/suggestion/SuggestionMessageField";
import { submitSuggestion } from "@/lib/actions/suggestionActions";
import { useSuggestionDraft } from "@/lib/hooks/useSuggestionDraft";
import { uploadSuggestionImage } from "@/lib/services/storageService";
import { generateDemoTicketCode } from "@/lib/utils/ticket";
import {
  suggestionFormSchema,
  type SuggestionFormValues,
} from "@/lib/validations/suggestionSchema";
import type { ShiftType, SuggestionCategory } from "@/types/database.types";

export interface SuggestionFormProps {
  /**
   * Optional custom submission handler.
   * Can return a generated ticket code string (e.g. UNSCH-K72M).
   */
  onSubmit?: (values: SuggestionFormValues) => Promise<string | void> | string | void;
  /** Optional callback invoked after successful submission with the ticket code. */
  onSuccess?: (ticketCode: string, values: SuggestionFormValues) => void;
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

  // Submission stage tracking (Issue 6.5)
  const [submissionStage, setSubmissionStage] = useState<SubmissionStage>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success modal state (Issue 6.6)
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    ticketCode: string;
    shift: ShiftType;
    category: SuggestionCategory;
  }>({
    isOpen: false,
    ticketCode: "",
    shift: "lunch",
    category: "menu",
  });

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
    if (submissionStage === "idle" && !successModal.isOpen) {
      updateDraft({
        text: currentMessage || "",
        turn: currentShift ? shiftToDraftTurn[currentShift] : "",
        category: currentCategory || "",
      });
    }
  }, [currentMessage, currentShift, currentCategory, submissionStage, successModal.isOpen, updateDraft]);

  const handleFormSubmit = async (values: SuggestionFormValues) => {
    setSubmitError(null);
    let slowTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      let photoUrl: string | null = null;

      // Stage 1: Upload compressed image if attached
      if (values.mediaFile) {
        setSubmissionStage("uploading_media");
        try {
          const uploadResult = await uploadSuggestionImage(values.mediaFile);
          photoUrl = uploadResult.publicUrl;
        } catch (uploadErr) {
          // If storage upload fails due to network, propagate clean message
          const msg =
            uploadErr instanceof Error
              ? uploadErr.message
              : "No se pudo subir la fotografía. Puedes intentar enviar sin foto.";
          throw new Error(msg);
        }
      }

      // Stage 2: Submit RPC to Supabase
      setSubmissionStage("submitting_rpc");

      // Defensive timeout: if request takes > 3.0 seconds, transition to slow network stage
      slowTimer = setTimeout(() => {
        setSubmissionStage("slow_network");
      }, 3000);

      let ticketCode: string;

      if (onSubmit) {
        // Custom handler (e.g. for testing, mocks or parent control)
        const customResult = await onSubmit(values);
        ticketCode =
          typeof customResult === "string" && customResult
            ? customResult
            : generateDemoTicketCode();
      } else {
        // Standard production RPC call via server action
        const result = await submitSuggestion({
          shift: values.shift,
          category: values.category,
          message: values.message,
          photoUrl,
        });

        if (!result.success) {
          if (
            process.env.NODE_ENV === "development" &&
            (result.error.includes("Sesión") ||
              result.error.includes("auth.uid") ||
              result.error.includes("permisos") ||
              result.error.includes("correo institucional"))
          ) {
            ticketCode = generateDemoTicketCode();
          } else {
            throw new Error(result.error);
          }
        } else {
          ticketCode = result.data.ticket_code;
        }
      }

      if (slowTimer) clearTimeout(slowTimer);

      // Save ticket code in browser's local tracking history
      try {
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem("unsch_recent_tickets");
          const recent: string[] = raw ? JSON.parse(raw) : [];
          if (!recent.includes(ticketCode)) {
            recent.unshift(ticketCode);
            window.localStorage.setItem(
              "unsch_recent_tickets",
              JSON.stringify(recent.slice(0, 10))
            );
          }
        }
      } catch {
        // Silently ignore private browsing or storage quota errors
      }

      // Clear ephemeral draft and reset form
      clearDraft();
      reset({
        shift: getCurrentShift(),
        category: undefined,
        message: "",
        mediaFile: null,
      });

      // Display Issue 6.6 Confirmation Modal
      setSuccessModal({
        isOpen: true,
        ticketCode,
        shift: values.shift,
        category: values.category,
      });

      setSubmissionStage("idle");
      onSuccess?.(ticketCode, values);
    } catch (error) {
      if (slowTimer) clearTimeout(slowTimer);
      setSubmissionStage("idle");
      const msg =
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al enviar la sugerencia. Por favor intenta de nuevo.";
      setSubmitError(msg);
    }
  };

  // Resolve dynamic button loading text based on active submission stage
  const getButtonLoadingText = () => {
    switch (submissionStage) {
      case "uploading_media":
        return "Subiendo imagen...";
      case "submitting_rpc":
        return "Generando ticket...";
      case "slow_network":
        return "Asegurando reporte...";
      default:
        return "Enviando reporte...";
    }
  };

  const isFormLocked = isSubmitting || submissionStage !== "idle";

  return (
    <>
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
          {hasDraft && draft.text && !isFormLocked && (
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

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          noValidate
          aria-busy={isFormLocked}
        >
          <CardContent className="space-y-6 p-5 sm:p-6">
            {/* Global Submit Error Banner (Preserves User Input) */}
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
                    disabled={isFormLocked}
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
                    disabled={isFormLocked}
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
                disabled={isFormLocked}
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
                    disabled={isFormLocked}
                  />
                )}
              />
            </section>
          </CardContent>

          {/* Submission Feedback & Action Footer */}
          <CardFooter
            withBorder
            className="flex flex-col gap-3 bg-gray-50/50 p-5 sm:p-6"
          >
            {/* Issue 6.5: Live progress banner for slow networks */}
            {isFormLocked && (
              <SubmissionLoadingState stage={submissionStage} className="w-full" />
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
              <p className="text-xs text-neutral-gray">
                Al enviar, confirmas que la información corresponde a tu experiencia personal.
              </p>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isFormLocked}
                disabled={isFormLocked}
                leftIcon={<Send className="size-4" />}
                className="w-full sm:w-auto"
              >
                {isFormLocked ? getButtonLoadingText() : "Enviar Sugerencia Anónima"}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Issue 6.6: Confirmation Modal with Copyable Ticket Code */}
      <SubmissionSuccessModal
        isOpen={successModal.isOpen}
        ticketCode={successModal.ticketCode}
        shift={successModal.shift}
        category={successModal.category}
        onClose={() => setSuccessModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
