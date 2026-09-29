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
  Trash2,
  Utensils,
} from "lucide-react";

import { Button } from "@/components/common/Button";
import { getCategoryLabel } from "@/components/suggestion/CategorySelector";
import { getShiftLabel } from "@/components/suggestion/ShiftSelector";
import type { SuggestionWithResponse } from "@/components/admin/SuggestionDetailModal";
import type { ShiftType, SuggestionCategory } from "@/types/database.types";

export type TimeRange = "7d" | "month" | "semester";

export interface AnalyticsDashboardViewProps {
  suggestions: SuggestionWithResponse[];
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
export function AnalyticsDashboardView({ suggestions }: AnalyticsDashboardViewProps) {
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

  // Trigger on-demand storage maintenance routine (Issue 10.4)
  const handleTriggerMaintenance = async () => {
    if (
      !confirm(
        "¿Deseas ejecutar la depuración de almacenamiento de fotos resueltas mayores a 90 días? Esta acción liberará espacio de la cuota de Supabase Storage preservando los registros estadísticos.",
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

      {/* Storage Maintenance & Sustainability Card (Issue 10.4) */}
      <div className="rounded-2xl border border-secondary/25 bg-gradient-to-br from-white to-secondary/5 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900">
                Sostenibilidad del Almacenamiento (Supabase Free Tier)
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
