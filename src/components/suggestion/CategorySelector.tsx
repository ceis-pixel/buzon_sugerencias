"use client";

import { useId, type KeyboardEvent } from "react";
import {
  AlertCircle,
  Building2,
  Scale,
  Sparkles,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import type { SuggestionCategory } from "@/types/database.types";

export interface CategoryOption {
  id: SuggestionCategory;
  label: string;
  icon: LucideIcon;
}

export const CATEGORY_OPTIONS: readonly CategoryOption[] = [
  {
    id: "menu",
    label: "Menú / Sabor",
    icon: UtensilsCrossed,
  },
  {
    id: "hygiene",
    label: "Higiene / Limpieza",
    icon: Sparkles,
  },
  {
    id: "portion",
    label: "Cantidad / Porción",
    icon: Scale,
  },
  {
    id: "service",
    label: "Trato del Personal",
    icon: Users,
  },
  {
    id: "infrastructure",
    label: "Infraestructura / Menaje",
    icon: Building2,
  },
] as const;

/**
 * Returns human-readable category label in Peruvian Spanish.
 */
export function getCategoryLabel(category: SuggestionCategory | null): string {
  if (!category) return "";
  const option = CATEGORY_OPTIONS.find((item) => item.id === category);
  return option?.label ?? category;
}

export interface CategorySelectorProps {
  value: SuggestionCategory | null;
  onChange: (category: SuggestionCategory) => void;
  disabled?: boolean;
  errorMessage?: string;
  className?: string;
}

export function CategorySelector({
  value,
  onChange,
  disabled = false,
  errorMessage,
  className = "",
}: CategorySelectorProps) {
  const groupId = useId();
  const errorId = `${groupId}-error`;

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentCategory: SuggestionCategory
  ) => {
    if (disabled) return;

    const categoryKeys: SuggestionCategory[] = [
      "menu",
      "hygiene",
      "portion",
      "service",
      "infrastructure",
    ];
    const currentIndex = categoryKeys.indexOf(currentCategory);

    let nextCategory: SuggestionCategory | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      nextCategory = categoryKeys[(currentIndex + 1) % categoryKeys.length];
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      nextCategory =
        categoryKeys[(currentIndex - 1 + categoryKeys.length) % categoryKeys.length];
    }

    if (nextCategory) {
      onChange(nextCategory);
      const nextElement = document.getElementById(`${groupId}-${nextCategory}`);
      nextElement?.focus();
    }
  };

  const hasError = Boolean(errorMessage);

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div
        role="radiogroup"
        aria-label="Seleccionar categoría de sugerencia"
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className="flex flex-wrap gap-2 sm:gap-2.5"
      >
        {CATEGORY_OPTIONS.map((option, index) => {
          const isSelected = value === option.id;
          const Icon = option.icon;
          const optionId = `${groupId}-${option.id}`;
          // If no selection has been made, allow tab focus to the first chip
          const isFocusable = isSelected || (value === null && index === 0);

          return (
            <button
              key={option.id}
              id={optionId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isFocusable ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.id)}
              onKeyDown={(event) => handleKeyDown(event, option.id)}
              className={[
                "group inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border border-primary bg-primary text-white shadow-sm ring-1 ring-primary"
                  : hasError && value === null
                  ? "border border-primary/40 bg-white text-neutral-gray hover:border-primary hover:bg-red-50/20"
                  : "border border-gray-200 bg-white text-neutral-gray hover:border-secondary/40 hover:bg-slate-50 hover:text-gray-900",
              ].join(" ")}
            >
              <Icon
                className={`size-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                  isSelected ? "text-white" : "text-neutral-gray"
                }`}
                aria-hidden="true"
              />
              <span className={isSelected ? "font-semibold text-white" : "text-gray-800"}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {hasError && (
        <div
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 pt-0.5 text-xs font-semibold text-primary"
        >
          <AlertCircle className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
