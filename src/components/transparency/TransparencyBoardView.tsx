"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileQuestion,
  Search,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { ShiftBadge } from "@/components/common/ShiftBadge";
import {
  CATEGORY_OPTIONS,
  getCategoryLabel,
} from "@/components/suggestion/CategorySelector";
import { formatPeruvianDateTime } from "@/lib/utils/exportReport";
import type { ShiftType, SuggestionCategory } from "@/types/database.types";

export interface PublicImprovementItem {
  id: string;
  ticketCode: string;
  shift: ShiftType;
  category: SuggestionCategory;
  message: string;
  photoUrl?: string | null;
  createdAt: string;
  resolvedAt: string;
  officialResponse: string;
}

export interface TransparencyBoardViewProps {
  improvements: PublicImprovementItem[];
  semesterName?: string;
}

/**
 * Issue 10.6 — TransparencyBoardView (Client Component)
 *
 * Public board of resolved dining hall improvements for the UNSCH community:
 * - Displays exclusively resolved tickets with official public responses.
 * - Crimson Heritage cards with problem statement and adopted solution.
 * - Interactive category filters and keyword search.
 * - Prominent counter highlighting student impact.
 */
export function TransparencyBoardView({
  improvements,
  semesterName = "Semestre Académico 2026-II",
}: TransparencyBoardViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    SuggestionCategory | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    return improvements.filter((item) => {
      if (
        selectedCategory !== "all" &&
        item.category !== selectedCategory
      ) {
        return false;
      }

      if (searchQuery.trim() !== "") {
        const query = searchQuery.trim().toLowerCase();
        const msg = item.message.toLowerCase();
        const resp = item.officialResponse.toLowerCase();
        const code = item.ticketCode.toLowerCase();
        if (
          !msg.includes(query) &&
          !resp.includes(query) &&
          !code.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [improvements, selectedCategory, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-gray hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Inicio</span>
          </Link>

          <Link
            href="/preguntas-frecuentes"
            className="text-xs font-bold text-primary hover:underline"
          >
            Centro de Ayuda / FAQs →
          </Link>
        </div>

        {/* Hero Impact Counter Banner */}
        <div className="rounded-3xl border border-secondary/25 bg-gradient-to-br from-primary via-primary/95 to-[#3b0000] p-6 sm:p-8 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold text-white tracking-wide uppercase">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Mural de Transparencia Pública
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                La voz estudiantil transforma el comedor
              </h1>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Medidas y mejoras adoptadas por la Junta de Vigilancia del Comedor Universitario
                (JVC) a partir de las sugerencias de los comensales.
              </p>
            </div>

            {/* Public Counter Badge */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md p-5 border border-white/20 text-center min-w-[180px] shadow-sm">
              <span className="text-4xl sm:text-5xl font-black text-amber-300 font-mono">
                {improvements.length}
              </span>
              <span className="text-xs font-bold text-white mt-1 uppercase tracking-wider">
                Casos Resueltos
              </span>
              <span className="text-[11px] text-white/70 mt-0.5">
                {semesterName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-neutral-gray/20 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-gray">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por mejora, alimento o código de ticket…"
              className="block w-full rounded-xl border border-neutral-gray/30 bg-slate-50/50 py-2.5 pl-9 pr-4 text-xs sm:text-sm text-gray-900 placeholder:text-neutral-gray shadow-xs focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Category Quick Filter */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="public-category-filter"
              className="text-xs font-semibold text-gray-700 whitespace-nowrap hidden sm:inline"
            >
              Categoría:
            </label>
            <select
              id="public-category-filter"
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(
                  e.target.value as SuggestionCategory | "all",
                )
              }
              className="rounded-xl border border-neutral-gray/30 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todas las categorías</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center justify-between text-xs text-neutral-gray pt-1 border-t border-neutral-gray/10">
          <span>
            Mostrando <strong>{filteredItems.length}</strong> mejoras
            verificadas
          </span>
          <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            100% Anónimo y Auditado
          </span>
        </div>
      </div>

      {/* Improvements Card Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-neutral-gray/20 bg-white p-8 shadow-sm">
          <EmptyState
            icon={FileQuestion}
            title="Sin casos coincidentes"
            description="No encontramos mejoras resueltas que coincidan con los criterios de búsqueda seleccionados. Intenta probar con otra categoría."
            variant="plain"
            action={{
              label: "Restablecer Filtros",
              onClick: () => {
                setSelectedCategory("all");
                setSearchQuery("");
              },
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-neutral-gray/20 bg-white p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header: Tags & Date */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-gray/15 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <ShiftBadge shift={item.shift} size="sm" />
                    <Badge variant="outline" size="sm">
                      {getCategoryLabel(item.category)}
                    </Badge>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary">
                    #{item.ticketCode}
                  </span>
                </div>

                {/* Student's observation (Disassociated) */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-neutral-gray uppercase tracking-wider">
                    Observación de la Comunidad:
                  </span>
                  <p className="text-xs sm:text-sm text-gray-800 leading-relaxed italic bg-slate-50 p-3 rounded-xl border border-neutral-gray/10">
                    &ldquo;{item.message}&rdquo;
                  </p>
                </div>

                {/* Adopted Solution / Official Response */}
                <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/70 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Medida adoptada por la JVC:</span>
                  </div>
                  <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                    {item.officialResponse}
                  </p>
                </div>
              </div>

              {/* Card Footer: Timestamp */}
              <div className="flex items-center justify-between text-[11px] text-neutral-gray border-t border-neutral-gray/10 pt-2.5">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Atendido: {formatPeruvianDateTime(item.resolvedAt || item.createdAt)}
                </span>
                <span className="font-semibold text-primary">
                  Junta de Vigilancia (JVC)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Call to Action Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
        <h3 className="text-base font-bold text-primary">
          ¿Tienes una observación o propuesta de mejora para el comedor?
        </h3>
        <p className="text-xs text-neutral-gray max-w-lg mx-auto">
          Participa activamente en el siguiente servicio. Tu reporte es anónimo y permite
          fiscalizar las raciones, la calidad del menú y la higiene en beneficio de todos.
        </p>
        <div className="pt-1">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity"
          >
            Enviar Nueva Sugerencia →
          </Link>
        </div>
      </div>
    </div>
  );
}
