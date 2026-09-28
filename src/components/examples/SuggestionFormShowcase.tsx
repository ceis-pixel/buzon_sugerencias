"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Info, RotateCcw } from "lucide-react";

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
import {
  CategorySelector,
  getCategoryLabel,
} from "@/components/suggestion/CategorySelector";
import {
  getCurrentShift,
  getShiftLabel,
  getShiftSchedule,
  ShiftSelector,
} from "@/components/suggestion/ShiftSelector";
import type { ShiftType, SuggestionCategory } from "@/types/database.types";

export function SuggestionFormShowcase() {
  // Smart default initialized based on user's current system time
  const detectedInitialShift = useMemo(() => getCurrentShift(), []);
  const [shift, setShift] = useState<ShiftType>(detectedInitialShift);
  const [category, setCategory] = useState<SuggestionCategory | null>("hygiene");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [hasValidated, setHasValidated] = useState(false);

  const handleCategoryChange = (newCategory: SuggestionCategory) => {
    setCategory(newCategory);
    setHasValidated(false);
    if (errorMessage) {
      setErrorMessage(undefined);
    }
  };

  const handleSimulateSubmit = () => {
    setHasValidated(true);
    if (!category) {
      setErrorMessage("Por favor, selecciona una categoría para clasificar tu observación.");
    } else {
      setErrorMessage(undefined);
    }
  };

  const handleReset = () => {
    setShift(getCurrentShift());
    setCategory(null);
    setErrorMessage(undefined);
    setHasValidated(false);
  };

  const shiftLabel = getShiftLabel(shift);
  const shiftSchedule = getShiftSchedule(shift);
  const categoryLabel = getCategoryLabel(category);

  return (
    <Card variant="default" padding="none" className="overflow-hidden border-gray-200">
      {/* Header with Didactic Step Label */}
      <CardHeader className="flex-col items-start gap-2 border-b border-gray-100 bg-slate-50/50 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="tertiary" size="sm">
            Paso 1
          </Badge>
          <Badge variant="neutral" size="sm" icon={<Clock className="size-3.5" />}>
            Turno inteligente: {shiftLabel} ({shiftSchedule})
          </Badge>
        </div>
        <CardTitle as="h2" className="text-xl sm:text-2xl text-primary">
          ¿Cuándo y sobre qué es tu observación?
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-relaxed">
          El sistema detecta automáticamente el turno en curso en el comedor. Puedes cambiarlo
          libremente y elegir la categoría que mejor describa tu experiencia.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 p-5 sm:p-6">
        {/* Issue 6.1: Shift Selector */}
        <section aria-labelledby="shift-section-title" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3
              id="shift-section-title"
              className="text-xs font-bold uppercase tracking-wider text-neutral-gray"
            >
              1. Turno de atención
            </h3>
            <span className="text-[11px] text-neutral-gray">
              Preseleccionado según tu hora local
            </span>
          </div>

          <ShiftSelector
            value={shift}
            onChange={(newShift) => {
              setShift(newShift);
            }}
          />
        </section>

        {/* Issue 6.2: Category Selector */}
        <section aria-labelledby="category-section-title" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3
              id="category-section-title"
              className="text-xs font-bold uppercase tracking-wider text-neutral-gray"
            >
              2. Categoría de la observación
            </h3>
            <span className="text-[11px] text-neutral-gray">Un solo toque</span>
          </div>

          <CategorySelector
            value={category}
            onChange={handleCategoryChange}
            errorMessage={errorMessage}
          />
        </section>

        {/* Dynamic Real-time Selection Summary */}
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-gray-200/80 bg-slate-50/70 p-4 transition-all duration-150"
        >
          <div className="flex items-start gap-3">
            {category ? (
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
            ) : (
              <Info className="mt-0.5 size-5 shrink-0 text-tertiary" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-gray">
                Resumen de la observación
              </p>
              <p className="text-sm font-semibold text-gray-900 break-words">
                {category ? (
                  <>
                    Observación para <span className="text-primary font-bold">{shiftLabel}</span>{" "}
                    • Categoría:{" "}
                    <span className="text-primary font-bold">{categoryLabel}</span>
                  </>
                ) : (
                  <>
                    Observación para <span className="text-primary font-bold">{shiftLabel}</span>{" "}
                    •{" "}
                    <span className="text-amber-800 font-medium">
                      Selecciona una categoría arriba para continuar
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs text-neutral-gray">
                Horario de servicio: {shiftSchedule}
              </p>
              {hasValidated && !errorMessage && category && (
                <div className="pt-1">
                  <Badge variant="success" size="sm">
                    Selección lista para redactar tu mensaje
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Interactive Controls & Demonstration Actions */}
      <CardFooter
        withBorder
        className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/40 px-5 py-3 sm:px-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={handleSimulateSubmit}
          >
            Validar selección
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setCategory(null);
              setErrorMessage(undefined);
            }}
          >
            Quitar categoría
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          leftIcon={<RotateCcw className="size-3.5" />}
          onClick={handleReset}
        >
          Reiniciar al turno actual
        </Button>
      </CardFooter>
    </Card>
  );
}
