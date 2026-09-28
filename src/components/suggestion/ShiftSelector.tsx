"use client";

import { useId, type KeyboardEvent } from "react";
import { Coffee, Moon, Utensils, type LucideIcon } from "lucide-react";

import type { ShiftType } from "@/types/database.types";

export interface ShiftOption {
  id: ShiftType;
  label: string;
  schedule: string;
  icon: LucideIcon;
}

export const SHIFT_OPTIONS: readonly ShiftOption[] = [
  {
    id: "breakfast",
    label: "Desayuno",
    schedule: "06:30 - 08:30",
    icon: Coffee,
  },
  {
    id: "lunch",
    label: "Almuerzo",
    schedule: "11:30 - 14:00",
    icon: Utensils,
  },
  {
    id: "dinner",
    label: "Cena",
    schedule: "17:30 - 19:30",
    icon: Moon,
  },
] as const;

/**
 * Resolves the default meal shift based on system local time.
 * - Desayuno: 06:00 to 10:59 (official service: 06:30 - 08:30)
 * - Almuerzo: 11:00 to 16:29 (official service: 11:30 - 14:00)
 * - Cena: 16:30 to 23:59 (official service: 17:30 - 19:30)
 * - Night / early dawn (00:00 - 05:59): defaults to breakfast (upcoming service)
 */
export function getCurrentShift(date: Date = new Date()): ShiftType {
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (minutes >= 360 && minutes < 660) {
    return "breakfast";
  }
  if (minutes >= 660 && minutes < 990) {
    return "lunch";
  }
  if (minutes >= 990) {
    return "dinner";
  }
  return "breakfast";
}

/**
 * Returns human-readable shift label in Peruvian Spanish.
 */
export function getShiftLabel(shift: ShiftType): string {
  const option = SHIFT_OPTIONS.find((item) => item.id === shift);
  return option?.label ?? shift;
}

/**
 * Returns reference schedule string for a given shift.
 */
export function getShiftSchedule(shift: ShiftType): string {
  const option = SHIFT_OPTIONS.find((item) => item.id === shift);
  return option?.schedule ?? "";
}

export interface ShiftSelectorProps {
  value: ShiftType;
  onChange: (shift: ShiftType) => void;
  disabled?: boolean;
  className?: string;
}

export function ShiftSelector({
  value,
  onChange,
  disabled = false,
  className = "",
}: ShiftSelectorProps) {
  const groupId = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentShift: ShiftType) => {
    if (disabled) return;

    const shiftKeys: ShiftType[] = ["breakfast", "lunch", "dinner"];
    const currentIndex = shiftKeys.indexOf(currentShift);

    let nextShift: ShiftType | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      nextShift = shiftKeys[(currentIndex + 1) % shiftKeys.length];
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      nextShift = shiftKeys[(currentIndex - 1 + shiftKeys.length) % shiftKeys.length];
    }

    if (nextShift) {
      onChange(nextShift);
      const nextElement = document.getElementById(`${groupId}-${nextShift}`);
      nextElement?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Seleccionar turno de atención"
      className={`grid grid-cols-3 gap-2.5 ${className}`}
    >
      {SHIFT_OPTIONS.map((option) => {
        const isSelected = value === option.id;
        const Icon = option.icon;
        const optionId = `${groupId}-${option.id}`;

        return (
          <button
            key={option.id}
            id={optionId}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${option.label}, horario de ${option.schedule}`}
            tabIndex={isSelected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => handleKeyDown(event, option.id)}
            className={[
              "group relative flex min-h-[64px] flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all duration-150 active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "border-2 border-primary bg-primary text-white shadow-sm ring-1 ring-primary"
                : "border border-gray-200 bg-white text-neutral-gray hover:border-secondary/50 hover:bg-slate-50",
            ].join(" ")}
          >
            <Icon
              className={`size-5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                isSelected ? "text-white" : "text-neutral-gray"
              }`}
              aria-hidden="true"
            />
            <span
              className={`mt-1.5 text-xs font-bold leading-tight sm:text-sm ${
                isSelected ? "text-white" : "text-gray-900"
              }`}
            >
              {option.label}
            </span>
            <span
              className={`mt-0.5 text-[10px] font-medium leading-tight sm:text-xs ${
                isSelected ? "text-white/80" : "text-neutral-gray"
              }`}
            >
              {option.schedule}
            </span>
          </button>
        );
      })}
    </div>
  );
}
