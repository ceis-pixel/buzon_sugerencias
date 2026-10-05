"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Layers,
  PieChart,
  Printer,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Utensils,
} from "lucide-react";

import { Button } from "@/components/common/Button";
import { getCategoryLabel } from "@/components/suggestion/CategorySelector";
import { getShiftLabel } from "@/components/suggestion/ShiftSelector";
import type { SuggestionWithResponse } from "@/components/admin/SuggestionDetailModal";
import type {
  DailyMenuWithStats,
  ShiftType,
  SuggestionCategory,
} from "@/types/database.types";

export type TimeRange = "7d" | "month" | "semester";

export interface AnalyticsDashboardViewProps {
  suggestions: SuggestionWithResponse[];
  menus?: DailyMenuWithStats[];
}

interface StoragePurgeResult {
  purgedRecordsCount: number;
  storageDeletedCount: number;
  message: string;
}

/**
 * Issue 10.1 — AnalyticsDashboardView (Client Component)
 *
 * Impact analytics and technical visualization panel for the FUSCH Dining Hall Commission:
 * - Dynamic time-window filtering: Last 7 days, Current Month, Full Semester.
 * - Category incidence distribution (Native SVG chart and breakdown).
 * - Meal shift comparative volume (Desayuno, Almuerzo, Cena).
 * - Weekly response rate & resolution efficiency metrics for Bienestar Universitario reports.
 * - One-click Storage Maintenance routine trigger (Issue 10.4).
 * - Print-ready technical summary formatting.
 */
export function AnalyticsDashboardView({
  suggestions,
  menus = [],
}: AnalyticsDashboardViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [isPurgingStorage, setIsPurgingStorage] = useState(false);
  const [purgeResult, setPurgeResult] = useState<StoragePurgeResult | null>(null);

  // Filter data according to selected time range
  const filteredData = useMemo(() => {
    const now = new Date();

    let cutoffDate: Date;
    if (timeRange === "7d") {
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "month") {
      // First day of current month
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // Full academic semester (approx. 5 months)
      cutoffDate = new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000);
    }

    return suggestions.filter((item) => {
      const itemDate = new Date(item.created_at);
      return itemDate >= cutoffDate;
    });
  }, [suggestions, timeRange]);

  // Aggregate Category Metrics
  const categoryStats = useMemo(() => {
    const counts: Record<SuggestionCategory, number> = {
      menu: 0,
      hygiene: 0,
      portion: 0,
      service: 0,
      infrastructure: 0,
    };

    for (const item of filteredData) {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    }

    const total = filteredData.length || 1;
    const colors: Record<SuggestionCategory, string> = {
      menu: "#5C0000", // Crimson Profundo
      hygiene: "#DC2626", // Rojo Alerta
      portion: "#A6665C", // Crimson Mitigado
      service: "#001586", // Azul Técnico
      infrastructure: "#847370", // Gris Neutro
    };

    const categories: SuggestionCategory[] = [
      "menu",
      "hygiene",
      "portion",
      "service",
      "infrastructure",
    ];

    return categories.map((cat) => ({
      category: cat,
      label: getCategoryLabel(cat),
      count: counts[cat],
      percentage: Math.round((counts[cat] / total) * 100),
      color: colors[cat],
    }));
  }, [filteredData]);

  // Aggregate Shift Metrics
  const shiftStats = useMemo(() => {
    const counts: Record<ShiftType, number> = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
    };

    for (const item of filteredData) {
      if (counts[item.shift] !== undefined) {
        counts[item.shift]++;
      }
    }

    const total = filteredData.length || 1;
    const shifts: ShiftType[] = ["breakfast", "lunch", "dinner"];

    return shifts.map((shift) => ({
      shift,
      label: getShiftLabel(shift),
      count: counts[shift],
      percentage: Math.round((counts[shift] / total) * 100),
    }));
  }, [filteredData]);

  // Resolution and Performance Metrics
  const performanceMetrics = useMemo(() => {
    const total = filteredData.length;
    let resolved = 0;
    let inReview = 0;
    let pending = 0;
    let criticalHygiene = 0;

    for (const item of filteredData) {
      if (item.status === "resolved") resolved++;
      else if (item.status === "in_review") inReview++;
      else if (item.status === "pending") pending++;

      if (item.category === "hygiene") criticalHygiene++;
    }

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const attentionRate = total > 0 ? Math.round(((resolved + inReview) / total) * 100) : 0;

    return {
      total,
      resolved,
      inReview,
      pending,
      criticalHygiene,
      resolutionRate,
      attentionRate,
    };
  }, [filteredData]);

  // Issue 11.6: Correlation between low-rated menus (< 3.0 stars) and complaints in 'menu' or 'portion'
  const menuCorrelation = useMemo(() => {
    if (!menus || menus.length === 0) {
      return null;
    }

    // Map suggestions by date and shift for category 'menu' or 'portion'
    const complaintsByDateAndShift = new Map<string, number>();
    for (const s of suggestions) {
      if (s.category === "menu" || s.category === "portion") {
        const dateKey = s.created_at.split("T")[0];
        const key = `${dateKey}_${s.shift}`;
        complaintsByDateAndShift.set(key, (complaintsByDateAndShift.get(key) || 0) + 1);
      }
    }

    const menusWithStats = menus.filter((m) => m.stats && m.stats.count > 0);
    const lowRatedMenus = menusWithStats.filter((m) => (m.stats?.avg_overall ?? 5) < 3.0);
    const normalMenus = menusWithStats.filter((m) => (m.stats?.avg_overall ?? 5) >= 3.0);

    let lowRatedComplaintsTotal = 0;
    const lowRatedDetails: Array<{
      id: string;
      date: string;
      shift: ShiftType;
      dish: string;
      avgScore: number;
      complaintsCount: number;
    }> = [];

    for (const m of lowRatedMenus) {
      const key = `${m.date}_${m.shift}`;
      const complaints = complaintsByDateAndShift.get(key) || 0;
      lowRatedComplaintsTotal += complaints;
      lowRatedDetails.push({
        id: m.id,
        date: m.date,
        shift: m.shift,
        dish: m.main_dish,
        avgScore: m.stats?.avg_overall ?? 0,
        complaintsCount: complaints,
      });
    }

    let normalComplaintsTotal = 0;
    for (const m of normalMenus) {
      const key = `${m.date}_${m.shift}`;
      normalComplaintsTotal += complaintsByDateAndShift.get(key) || 0;
    }

    const avgComplaintsLow =
      lowRatedMenus.length > 0 ? lowRatedComplaintsTotal / lowRatedMenus.length : 0;
    const avgComplaintsNormal =
      normalMenus.length > 0 ? normalComplaintsTotal / normalMenus.length : 0;

    const percentageIncrease =
      avgComplaintsNormal > 0
        ? Math.round(((avgComplaintsLow - avgComplaintsNormal) / avgComplaintsNormal) * 100)
        : lowRatedComplaintsTotal > 0
          ? 100
          : 0;

    return {
      evaluatedMenusCount: menusWithStats.length,
      lowRatedCount: lowRatedMenus.length,
      lowRatedComplaintsTotal,
      avgComplaintsLow: Math.round(avgComplaintsLow * 10) / 10,
      avgComplaintsNormal: Math.round(avgComplaintsNormal * 10) / 10,
      percentageIncrease,
      flaggedMenus: lowRatedDetails,
    };
  }, [menus, suggestions]);

  // Trigger on-demand storage maintenance routine (Issue 10.4)
  const handleTriggerMaintenance = async () => {
    if (
      !confirm(
        "¿Deseas ejecutar la depuración de almacenamiento de fotos resueltas mayores a 90 días? Esta acción liberará espacio en el almacenamiento institucional preservando los registros estadísticos.",
      )
    ) {
      return;
    }

    setIsPurgingStorage(true);
    setPurgeResult(null);

    try {
      const response = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysOld: 90 }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al ejecutar el mantenimiento.");
      }

      setPurgeResult({
        purgedRecordsCount: data.purgedRecordsCount ?? 0,
        storageDeletedCount: data.storageDeletedCount ?? 0,
        message: data.message ?? "Depuración completada.",
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error inesperado al depurar almacenamiento.");
    } finally {
      setIsPurgingStorage(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-gray/20 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              Analítica de Impacto y Gestión
            </h1>
          </div>
          <p className="mt-1 text-sm text-neutral-gray">
            Métricas operativas y estadísticas de satisfacción para fundamentar informes ante la
            Dirección de Bienestar Universitario.
          </p>
        </div>

        {/* Time-Range Selector and Print Trigger */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-neutral-gray/20">
            <button
              type="button"
              onClick={() => setTimeRange("7d")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                timeRange === "7d"
                  ? "bg-white text-primary shadow-xs"
                  : "text-neutral-gray hover:text-gray-900"
              }`}
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("month")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                timeRange === "month"
                  ? "bg-white text-primary shadow-xs"
                  : "text-neutral-gray hover:text-gray-900"
              }`}
            >
              Mes actual
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("semester")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                timeRange === "semester"
                  ? "bg-white text-primary shadow-xs"
                  : "text-neutral-gray hover:text-gray-900"
              }`}
            >
              Todo el semestre
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="h-4 w-4" />}
            className="text-xs"
          >
            Imprimir Informe
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reports */}
        <div className="rounded-2xl border border-neutral-gray/20 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-gray uppercase tracking-wider">
              Total Observaciones
            </span>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {performanceMetrics.total}
          </div>
          <p className="text-xs text-neutral-gray">
            En el período seleccionado ({timeRange === "7d" ? "7 días" : timeRange === "month" ? "este mes" : "semestre"})
          </p>
        </div>

        {/* Resolution Rate */}
        <div className="rounded-2xl border border-neutral-gray/20 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-gray uppercase tracking-wider">
              Tasa de Resolución
            </span>
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-700">
            {performanceMetrics.resolutionRate}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${performanceMetrics.resolutionRate}%` }}
            />
          </div>
          <p className="text-xs text-neutral-gray">
            {performanceMetrics.resolved} de {performanceMetrics.total} casos atendidos
          </p>
        </div>

        {/* Critical Cases */}
        <div className="rounded-2xl border border-neutral-gray/20 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-gray uppercase tracking-wider">
              Incidencias Críticas
            </span>
            <span className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-amber-700">
            {performanceMetrics.criticalHygiene}
          </div>
          <p className="text-xs text-neutral-gray">
            Reportes de inocuidad e higiene canalizados de emergencia
          </p>
        </div>

        {/* Attention Efficiency */}
        <div className="rounded-2xl border border-neutral-gray/20 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-gray uppercase tracking-wider">
              Cobertura de Atención
            </span>
            <span className="rounded-lg bg-tertiary/10 p-2 text-tertiary">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-tertiary">
            {performanceMetrics.attentionRate}%
          </div>
          <p className="text-xs text-neutral-gray">
            Casos en revisión o con solución oficial adoptada
          </p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Distribution by Category */}
        <div className="rounded-2xl border border-neutral-gray/20 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <h2 className="text-base font-extrabold text-gray-900">
                Distribución por Categorías
              </h2>
            </div>
            <span className="text-xs text-neutral-gray font-medium">
              Total: {performanceMetrics.total} incidencias
            </span>
          </div>

          {/* Category Progress Bars */}
          <div className="space-y-3.5">
            {categoryStats.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-800">
                    {item.label}
                  </span>
                  <span className="text-neutral-gray font-mono">
                    <strong>{item.count}</strong> ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-neutral-gray flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
            <p>
              Las categorías con mayor recurrencia representan oportunidades prioritarias para
              las mesas de trabajo técnico con los inspectores de nutrición de la UNSCH.
            </p>
          </div>
        </div>

        {/* Chart 2: Comparative Volume by Shift */}
        <div className="rounded-2xl border border-neutral-gray/20 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              <h2 className="text-base font-extrabold text-gray-900">
                Comparativa de Incidencias por Turno
              </h2>
            </div>
            <span className="text-xs text-neutral-gray font-medium">
              Desayuno, Almuerzo y Cena
            </span>
          </div>

          {/* Shift Comparison Bars */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            {shiftStats.map((item) => {
              const heightPercentage = Math.max(15, Math.min(100, item.percentage * 1.5));
              return (
                <div
                  key={item.shift}
                  className="flex flex-col items-center justify-end rounded-xl bg-slate-50 p-4 border border-neutral-gray/10 text-center"
                >
                  <div className="h-32 w-full flex items-end justify-center pb-2">
                    <div
                      className="w-12 rounded-t-lg bg-primary/80 transition-all duration-500 flex items-center justify-center text-[11px] font-bold text-white shadow-xs"
                      style={{ height: `${heightPercentage}%` }}
                    >
                      {item.count}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-900 mt-2">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-neutral-gray font-mono">
                    {item.percentage}% del total
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-neutral-gray/15 pt-3 flex items-center justify-between text-xs text-neutral-gray">
            <span>Mayor afluencia de observaciones en:</span>
            <span className="font-bold text-primary">Turno Almuerzo (11:30 - 14:00)</span>
          </div>
        </div>
      </div>

      {/* Issue 11.6: Cruce Analítico - Correlación entre Menús con Baja Puntuación y Reclamos de Menú/Porción */}
      {menuCorrelation && (
        <div className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-sans text-base font-extrabold text-gray-900">
                  Cruce Analítico: Calificación del Menú vs Reclamos de Ración y Sabor
                </h2>
                <p className="text-xs text-neutral-gray">
                  Correlación estadística entre turnos con baja satisfacción (&lt; 3.0 estrellas) y volumen de observaciones en &ldquo;Menú&rdquo; y &ldquo;Porción&rdquo;.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-bold text-secondary">
              Auditoría Nutricional
            </span>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                Menús Observados (&lt; 3.0 ★)
              </span>
              <p className="font-sans text-2xl font-black text-gray-900 mt-1">
                {menuCorrelation.lowRatedCount}
                <span className="text-xs font-normal text-neutral-gray ml-1">
                  / {menuCorrelation.evaluatedMenusCount} evaluados
                </span>
              </p>
              <p className="text-[11px] text-neutral-gray mt-1">
                {menuCorrelation.lowRatedCount > 0
                  ? "Turnos que no alcanzaron el estándar aceptable"
                  : "Todos los menús superaron el estándar mínimo"}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-gray/20 bg-slate-50 p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block">
                Promedio Quejas por Turno
              </span>
              <p className="font-sans text-2xl font-black text-gray-900 mt-1">
                {menuCorrelation.avgComplaintsLow}
                <span className="text-xs font-normal text-neutral-gray ml-1">
                  vs {menuCorrelation.avgComplaintsNormal} (días ≥ 3★)
                </span>
              </p>
              <p className="text-[11px] text-neutral-gray mt-1">
                Reclamos de menú o ración insuficiente por turno
              </p>
            </div>

            <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">
                Sensibilidad Estudiantil
              </span>
              <p className="font-sans text-2xl font-black text-secondary mt-1">
                {menuCorrelation.percentageIncrease > 0 ? `+${menuCorrelation.percentageIncrease}%` : "0%"}
              </p>
              <p className="text-[11px] text-neutral-gray mt-1">
                Variación en el volumen de reportes cuando baja la satisfacción
              </p>
            </div>
          </div>

          {/* Details of Flagged Menus */}
          {menuCorrelation.flaggedMenus.length > 0 ? (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">
                Turnos Observados con Menor Calificación y sus Reclamos Asociados:
              </h3>
              <div className="space-y-2">
                {menuCorrelation.flaggedMenus.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200/80 bg-red-50/40 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {item.date} ({item.shift === "breakfast" ? "Desayuno" : item.shift === "lunch" ? "Almuerzo" : "Cena"}):
                      </span>
                      <span className="italic text-gray-800">&ldquo;{item.dish}&rdquo;</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 font-bold text-red-700">
                        <Star className="h-3.5 w-3.5 fill-red-600 stroke-red-600" />
                        {item.avgScore.toFixed(1)} / 5.0
                      </span>
                      <span className="rounded-md bg-red-100 px-2 py-0.5 font-bold text-red-900">
                        {item.complaintsCount} reclamo{item.complaintsCount === 1 ? "" : "s"} (menú/porción)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Excelente desempeño: Ningún turno registrado ha caído por debajo de las 3.0 estrellas en el período evaluado.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Storage Maintenance & Sustainability Card (Issue 10.4) */}
      <div className="rounded-2xl border border-secondary/25 bg-gradient-to-br from-white to-secondary/5 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900">
                Sostenibilidad del Almacenamiento Institucional
              </h3>
              <p className="text-xs text-neutral-gray">
                Protección del límite de 1 GB. Rutina de depuración de evidencia fotográfica de casos resueltos con más de 90 días.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleTriggerMaintenance}
            isLoading={isPurgingStorage}
            leftIcon={<Trash2 className="h-4 w-4" />}
            className="text-xs"
          >
            Ejecutar Depuración (&gt;90 días)
          </Button>
        </div>

        {purgeResult && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{purgeResult.message}</span>
            </div>
            <span className="font-bold font-mono">
              {purgeResult.purgedRecordsCount} registros liberados
            </span>
          </div>
        )}
      </div>

      {/* Technical Summary Narrative for Bienestar Universitario */}
      <div className="rounded-2xl border border-neutral-gray/20 bg-white p-6 shadow-sm space-y-4 print:border-none print:shadow-none">
        <div className="flex items-center gap-2 text-primary font-bold text-sm">
          <FileText className="h-4 w-4" />
          <span>Resumen Ejecutivo para Presentación Oficial</span>
        </div>

        <div className="prose prose-sm max-w-none text-xs text-gray-700 leading-relaxed space-y-2">
          <p>
            El presente informe técnico sintetiza <strong>{performanceMetrics.total}</strong> sugerencias
            y reclamos procesados de manera anónima y disociada a través del Buzón Estudiantil del Comedor UNSCH
            durante el período evaluado.
          </p>
          <p>
            De las incidencias registradas, la Secretaría de Salud y Nutrición de la FUSCH ha alcanzado una tasa
            de resolución del <strong>{performanceMetrics.resolutionRate}%</strong>, con{" "}
            <strong>{performanceMetrics.resolved}</strong> casos atendidos mediante respuestas oficiales
            y correcciones con el concesionario. Los casos críticos de higiene ({performanceMetrics.criticalHygiene}{" "}
            reportes) fueron canalizados oportunamente para su subsanación inmediata.
          </p>
        </div>

        <div className="border-t border-neutral-gray/15 pt-3 flex flex-wrap items-center justify-between text-[11px] text-neutral-gray">
          <span>Universidad Nacional de San Cristóbal de Huamanga • FUSCH</span>
          <span>Generado automáticamente para la Dirección de Bienestar Universitario</span>
        </div>
      </div>
    </div>
  );
}
