"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Coffee,
  Info,
  Loader2,
  Send,
  Soup,
  Sparkles,
  Star,
  Utensils,
} from "lucide-react";

import { submitMenuRating } from "@/lib/actions/menuRatingActions";
import type { DailyMenuRow, ShiftType } from "@/types/database.types";

export interface MenuRatingWidgetProps {
  menu: DailyMenuRow;
  initialHasRated?: boolean;
  onRatingSuccess?: () => void;
  className?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: "Muy deficiente",
  2: "Regular",
  3: "Aceptable",
  4: "Bueno",
  5: "Excelente",
};

interface StarRowProps {
  id: string;
  label: string;
  itemDescription?: string | null;
  icon: React.ReactNode;
  value: number;
  required?: boolean;
  onChange: (val: number) => void;
  disabled?: boolean;
}

function StarRow({
  id,
  label,
  itemDescription,
  icon,
  value,
  required = false,
  onChange,
  disabled = false,
}: StarRowProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const activeRating = hoverValue !== null ? hoverValue : value;

  return (
    <div className="space-y-2 rounded-xl border border-neutral-gray/15 bg-slate-50/70 p-3.5 transition-colors hover:border-secondary/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                {label}
              </span>
              {required ? (
                <span className="text-[10px] font-semibold text-primary" title="Obligatorio">
                  *
                </span>
              ) : (
                <span className="text-[10px] text-neutral-gray font-medium">(opcional)</span>
              )}
            </div>
            {itemDescription && (
              <p className="text-xs font-semibold text-gray-700 italic">
                &ldquo;{itemDescription}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Microtext */}
        <div className="min-h-5 text-right">
          {activeRating > 0 ? (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold transition-all ${
                activeRating >= 4
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : activeRating === 3
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              {RATING_LABELS[activeRating]}
            </span>
          ) : (
            <span className="text-[11px] text-neutral-gray">Toca para puntuar</span>
          )}
        </div>
      </div>

      {/* 5-Star Tactile Selector (optimized for touch screens >= 44px) */}
      <div
        className="flex items-center gap-1 sm:gap-2 pt-1"
        role="radiogroup"
        aria-label={`Calificación de ${label}`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating;
          return (
            <button
              key={star}
              type="button"
              id={`${id}-star-${star}`}
              disabled={disabled}
              onClick={() => {
                // If clicking the current value on optional item, allow toggle to 0
                if (!required && value === star) {
                  onChange(0);
                } else {
                  onChange(star);
                }
              }}
              onMouseEnter={() => !disabled && setHoverValue(star)}
              onMouseLeave={() => !disabled && setHoverValue(null)}
              onFocus={() => !disabled && setHoverValue(star)}
              onBlur={() => !disabled && setHoverValue(null)}
              className={`flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center rounded-xl border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isFilled
                  ? "border-primary/20 bg-primary/10 text-primary shadow-xs"
                  : "border-neutral-gray/20 bg-white text-neutral-gray hover:border-secondary hover:bg-secondary/5"
              } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              aria-label={`${star} estrella${star > 1 ? "s" : ""} - ${RATING_LABELS[star]}`}
            >
              <Star
                className={`h-5 w-5 transition-transform ${
                  isFilled ? "fill-primary stroke-primary scale-110" : "stroke-neutral-gray"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Issue 11.2 — Tactile Menu Rating Component (MenuRatingWidget)
 *
 * Micro-feedback mechanism with Zero-Knowledge pseudonymity:
 * - 1-touch 5-star scoring for Main Dish (required), Side Dish (optional), and Beverage (optional).
 * - Tactile buttons with minimum 44px hit targets.
 * - Dynamic Peruvian Spanish sentiment microtexts.
 * - Inactive / already voted state gracefully acknowledges participation.
 */
export function MenuRatingWidget({
  menu,
  initialHasRated = false,
  onRatingSuccess,
  className = "",
}: MenuRatingWidgetProps) {
  const [ratingMain, setRatingMain] = useState<number>(0);
  const [ratingSide, setRatingSide] = useState<number>(0);
  const [ratingBeverage, setRatingBeverage] = useState<number>(0);

  const [hasVoted, setHasVoted] = useState<boolean>(initialHasRated);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ratingMain < 1) {
      setErrorMessage("Por favor selecciona una puntuación para el Plato Principal.");
      return;
    }

    if (!menu.is_active) {
      setErrorMessage("La recepción de calificaciones para este menú está cerrada.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await submitMenuRating({
        menuId: menu.id,
        shift: menu.shift as ShiftType,
        ratingMain,
        ratingSide: ratingSide > 0 ? ratingSide : null,
        ratingBeverage: ratingBeverage > 0 ? ratingBeverage : null,
      });

      if (!response.success) {
        if (response.hasAlreadyRated) {
          setHasVoted(true);
        }
        setErrorMessage(response.message);
      } else {
        setHasVoted(true);
        setSuccessMessage(
          response.message ||
            "¡Calificación registrada con éxito! Tu opinión impulsa mejoras inmediatas en el comedor.",
        );
        onRatingSuccess?.();
      }
    } catch {
      setErrorMessage("Ocurrió una falla de conexión al registrar tu voto. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // State: Already voted for this shift
  if (hasVoted) {
    return (
      <div
        className={`rounded-2xl border border-secondary/30 bg-secondary/5 p-5 text-center shadow-xs transition-all ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-secondary/15 text-primary">
          <CheckCircle2 className="h-6 w-6 stroke-[2.2]" />
        </div>
        <h4 className="font-sans text-sm font-bold text-gray-900 sm:text-base">
          {successMessage || "Ya registraste tu opinión para el turno de hoy. ¡Gracias por participar!"}
        </h4>
        <p className="mt-1 text-xs text-neutral-gray max-w-md mx-auto">
          Tu voto anónimo ha sido contabilizado en el termómetro público y servirá de sustento para
          los informes técnicos de fiscalización del comedor.
        </p>
      </div>
    );
  }

  // State: Menu inactive
  if (!menu.is_active) {
    return (
      <div
        className={`rounded-2xl border border-neutral-gray/20 bg-slate-50 p-4 text-center text-xs text-neutral-gray ${className}`}
      >
        <Info className="mx-auto mb-1.5 h-5 w-5 text-neutral-gray" />
        <p className="font-semibold text-gray-700">Calificaciones cerradas</p>
        <p className="text-[11px] mt-0.5">
          La evaluación para este menú ha concluido. Consulta el termómetro final arriba.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm ${className}`}
      aria-label="Formulario de calificación rápida del menú"
    >
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
            <Utensils className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-sans text-sm font-extrabold text-gray-900 sm:text-base">
              Evalúa el Menú del Turno
            </h3>
            <p className="text-[11px] text-neutral-gray">
              Calificación en 1 toque · 100% anónima y protegida
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/10 px-2.5 py-0.5 text-[11px] font-bold text-tertiary">
          Zero-Knowledge
        </span>
      </div>

      {errorMessage && (
        <div
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs text-red-800"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Rating Row 1: Main Dish (Required) */}
      <StarRow
        id="rating-main"
        label="Plato Principal"
        itemDescription={menu.main_dish}
        icon={<Utensils className="h-4 w-4" />}
        value={ratingMain}
        required
        onChange={setRatingMain}
        disabled={isSubmitting}
      />

      {/* Rating Row 2: Side Dish / Soup (Optional) */}
      {menu.side_dish && (
        <StarRow
          id="rating-side"
          label="Sopa / Entrada"
          itemDescription={menu.side_dish}
          icon={<Soup className="h-4 w-4" />}
          value={ratingSide}
          onChange={setRatingSide}
          disabled={isSubmitting}
        />
      )}

      {/* Rating Row 3: Beverage (Optional) */}
      {menu.beverage && (
        <StarRow
          id="rating-beverage"
          label="Refresco / Bebida"
          itemDescription={menu.beverage}
          icon={<Coffee className="h-4 w-4" />}
          value={ratingBeverage}
          onChange={setRatingBeverage}
          disabled={isSubmitting}
        />
      )}

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-neutral-gray text-center sm:text-left">
          🔒 Tu voto se registra de forma anónima mediante hash efímero diario.
        </p>

        <button
          type="submit"
          disabled={ratingMain < 1 || isSubmitting}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary/95 hover:shadow active:scale-98 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Registrando opinión...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Enviar Calificación</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
