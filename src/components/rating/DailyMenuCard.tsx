"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Flame,
  Soup,
  Star,
  ThumbsUp,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";

import { MenuRatingWidget } from "@/components/rating/MenuRatingWidget";
import { checkHasUserRated, getDailyMenuWithStats } from "@/lib/actions/menuRatingActions";
import type { DailyMenuWithStats, ShiftType } from "@/types/database.types";

export interface DailyMenuCardProps {
  initialMenu?: DailyMenuWithStats | null;
  initialShift?: ShiftType;
  initialHasRated?: boolean;
  className?: string;
}

const SHIFT_INFO: Record<
  ShiftType,
  { label: string; period: string; icon: React.ReactNode }
> = {
  breakfast: {
    label: "Desayuno",
    period: "06:30 - 08:30",
    icon: <Coffee className="h-4 w-4" />,
  },
  lunch: {
    label: "Almuerzo",
    period: "11:30 - 14:00",
    icon: <Utensils className="h-4 w-4" />,
  },
  dinner: {
    label: "Cena",
    period: "17:30 - 19:30",
    icon: <Soup className="h-4 w-4" />,
  },
};

/**
 * Detects current meal shift according to Ayacucho local time.
 */
function detectCurrentShift(): ShiftType {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  return "dinner";
}

/**
 * Issue 11.4 — Public Daily Menu Card & Live Satisfaction Thermometer (DailyMenuCard)
 *
 * Prominent home screen card built with the Crimson Heritage Design System:
 * - Real-time shift tab switcher and active shift detection.
 * - Presentation of the daily university dining hall menu (Main, Soup, Beverage).
 * - Termómetro de Aceptación: visual progress gauge showing accumulated score and vote volume.
 * - Collapsible 1-touch evaluation widget (MenuRatingWidget) with Zero-Knowledge verification.
 */
export function DailyMenuCard({
  initialMenu,
  initialShift,
  initialHasRated = false,
  className = "",
}: DailyMenuCardProps) {
  const [activeShift, setActiveShift] = useState<ShiftType>(
    initialShift || (initialMenu?.shift as ShiftType) || detectCurrentShift(),
  );
  const [menuData, setMenuData] = useState<DailyMenuWithStats | null>(initialMenu || null);
  const [hasRated, setHasRated] = useState<boolean>(initialHasRated);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isLoadingShift, setIsLoadingShift] = useState<boolean>(false);

  // If initialMenu doesn't match activeShift on mount or user changes shift, fetch for that shift
  useEffect(() => {
    let isMounted = true;
    async function loadShiftMenu() {
      setIsLoadingShift(true);
      try {
        const [menuRes, userRatedRes] = await Promise.all([
          getDailyMenuWithStats(activeShift),
          checkHasUserRated(activeShift),
        ]);
        if (isMounted) {
          setMenuData(menuRes);
          setHasRated(userRatedRes);
        }
      } catch (err) {
        console.error("Failed to load shift menu:", err);
      } finally {
        if (isMounted) {
          setIsLoadingShift(false);
        }
      }
    }

    loadShiftMenu();
    return () => {
      isMounted = false;
    };
  }, [activeShift]);

  const stats = menuData?.stats;
  const ratingCount = stats?.count ?? 0;
  const overallAvg = stats?.avg_overall ?? 0;

  // Thermometer tone & message calculation
  const thermometerFeedback = useMemo(() => {
    if (ratingCount === 0) {
      return {
        tone: "neutral",
        label: "Sin votos aún",
        description: "Sé el primero en calificar el menú servido en este turno.",
        barColor: "bg-neutral-gray",
        percentage: 0,
      };
    }
    const pct = Math.min(100, Math.max(0, (overallAvg / 5) * 100));

    if (overallAvg >= 4.0) {
      return {
        tone: "success",
        label: "Alta Aceptación Estudiantil",
        description: "El menú supera ampliamente los estándares de satisfacción.",
        barColor: "bg-emerald-600",
        percentage: pct,
      };
    }
    if (overallAvg >= 3.0) {
      return {
        tone: "warning",
        label: "Aceptación Regular",
        description: "Opiniones divididas. La FUSCH monitorea la calidad del servicio.",
        barColor: "bg-amber-500",
        percentage: pct,
      };
    }
    return {
      tone: "critical",
      label: "Baja Satisfacción · En Observación",
      description: "Puntuación deficiente. Generando correlación con reportes técnicos.",
      barColor: "bg-primary",
      percentage: pct,
    };
  }, [overallAvg, ratingCount]);

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  }, []);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md ${className}`}
    >
      {/* Top Banner & Date Header */}
      <div className="border-b border-gray-100 bg-slate-50/80 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <UtensilsCrossed className="h-4 w-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans text-xs font-extrabold uppercase tracking-wider text-primary">
                  Menú Universitario del Día
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold text-secondary">
                  Oficial UNSCH
                </span>
              </div>
              <p className="text-xs text-neutral-gray capitalize flex items-center gap-1.5 mt-0.5">
                <Calendar className="h-3.5 w-3.5" />
                {todayFormatted}
              </p>
            </div>
          </div>

          {/* Shift Selector Tabs */}
          <div
            className="flex items-center rounded-xl border border-neutral-gray/20 bg-white p-1 shadow-xs"
            role="tablist"
            aria-label="Seleccionar turno de comida"
          >
            {(["breakfast", "lunch", "dinner"] as ShiftType[]).map((shift) => {
              const info = SHIFT_INFO[shift];
              const isSelected = activeShift === shift;
              return (
                <button
                  key={shift}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveShift(shift)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-primary text-white shadow-xs"
                      : "text-neutral-gray hover:text-gray-900 hover:bg-slate-50"
                  }`}
                >
                  {info.icon}
                  <span className="hidden sm:inline">{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="p-4 sm:p-6 space-y-5">
        {isLoadingShift ? (
          <div className="py-8 text-center text-xs text-neutral-gray flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Consultando programación de {SHIFT_INFO[activeShift].label}...</span>
          </div>
        ) : menuData ? (
          <>
            {/* Menu Items Showcase */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <Clock className="h-3.5 w-3.5 text-neutral-gray" />
                  Horario de atención: {SHIFT_INFO[activeShift].period}
                </span>
                {menuData.is_active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Turno Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-neutral-gray/20 px-2 py-0.5 text-[10px] font-bold text-neutral-gray">
                    Servicio Concluido
                  </span>
                )}
              </div>

              {/* 3 Dishes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Main Dish */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-primary mb-1.5">
                    <Utensils className="h-4 w-4" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wide">
                      Plato Principal
                    </span>
                  </div>
                  <p className="font-sans text-sm font-bold text-gray-900 leading-snug">
                    {menuData.main_dish}
                  </p>
                  {stats && stats.avg_main > 0 && (
                    <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <Star className="h-3 w-3 fill-primary" />
                      <span>{stats.avg_main.toFixed(1)} / 5</span>
                    </div>
                  )}
                </div>

                {/* Soup / Side Dish */}
                <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-secondary mb-1.5">
                    <Soup className="h-4 w-4" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wide">
                      Sopa o Entrada
                    </span>
                  </div>
                  <p className="font-sans text-sm font-semibold text-gray-800 leading-snug">
                    {menuData.side_dish || "No especificada"}
                  </p>
                  {stats && stats.avg_side !== null && stats.avg_side > 0 && (
                    <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-secondary">
                      <Star className="h-3 w-3 fill-secondary" />
                      <span>{stats.avg_side.toFixed(1)} / 5</span>
                    </div>
                  )}
                </div>

                {/* Beverage */}
                <div className="rounded-xl border border-tertiary/20 bg-tertiary/5 p-3.5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-tertiary mb-1.5">
                    <Coffee className="h-4 w-4" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wide">
                      Refresco / Bebida
                    </span>
                  </div>
                  <p className="font-sans text-sm font-semibold text-gray-800 leading-snug">
                    {menuData.beverage || "No especificada"}
                  </p>
                  {stats && stats.avg_beverage !== null && stats.avg_beverage > 0 && (
                    <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-tertiary">
                      <Star className="h-3 w-3 fill-tertiary" />
                      <span>{stats.avg_beverage.toFixed(1)} / 5</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Satisfaction Thermometer Section */}
            <div className="rounded-xl border border-gray-100 bg-slate-50/70 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" />
                  <span className="font-sans text-xs font-bold uppercase tracking-wider text-gray-900">
                    Termómetro de Satisfacción en Tiempo Real
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-sans text-sm font-extrabold text-gray-900">
                    <Star className="h-4 w-4 fill-amber-400 stroke-amber-500" />
                    {overallAvg > 0 ? overallAvg.toFixed(1) : "—"} / 5.0
                  </span>
                  <span className="text-xs text-neutral-gray">
                    ({ratingCount} voto{ratingCount === 1 ? "" : "s"})
                  </span>
                </div>
              </div>

              {/* Progress Bar Gauge */}
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`h-full transition-all duration-700 ease-out ${thermometerFeedback.barColor}`}
                  style={{ width: `${thermometerFeedback.percentage}%` }}
                />
              </div>

              {/* Micro-interpretation */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-gray gap-2">
                <span className="font-semibold text-gray-800">
                  Estado: {thermometerFeedback.label}
                </span>
                <span>{thermometerFeedback.description}</span>
              </div>
            </div>

            {/* Collapsible Action: Rate / Evaluated Status */}
            <div>
              {hasRated ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-center text-xs text-emerald-900 flex items-center justify-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-emerald-700" />
                  <span className="font-bold">
                    Ya registraste tu opinión para el turno de {SHIFT_INFO[activeShift].label} de hoy. ¡Gracias por participar!
                  </span>
                </div>
              ) : menuData.is_active ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen((prev) => !prev)}
                    className="flex w-full min-h-[44px] items-center justify-between rounded-xl border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm font-bold text-primary transition-all hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-primary" />
                      {isFormOpen
                        ? "Ocultar formulario de evaluación"
                        : "Calificar Menú de este Turno (1 Toque)"}
                    </span>
                    {isFormOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {/* Embedded MenuRatingWidget */}
                  {isFormOpen && (
                    <div className="animate-fade-in pt-1">
                      <MenuRatingWidget
                        menu={menuData}
                        initialHasRated={hasRated}
                        onRatingSuccess={async () => {
                          setHasRated(true);
                          setIsFormOpen(false);
                          const updated = await getDailyMenuWithStats(activeShift);
                          if (updated) setMenuData(updated);
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          /* Empty State: Menu not registered yet */
          <div className="rounded-xl border border-dashed border-neutral-gray/25 p-8 text-center">
            <Utensils className="mx-auto h-8 w-8 text-neutral-gray/70 mb-2" />
            <h4 className="font-sans text-sm font-bold text-gray-800">
              Menú aún no publicado para el turno de {SHIFT_INFO[activeShift].label}
            </h4>
            <p className="mt-1 text-xs text-neutral-gray max-w-sm mx-auto">
              La Comisión de Comedor de la FUSCH publicará la programación de este turno antes de
              iniciar el servicio de atención.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
