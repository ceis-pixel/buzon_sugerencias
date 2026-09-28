"use client";

import {
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/common/Card";

export interface DashboardMetrics {
  total: number;
  weeklyIncrement: number;
  pending: number;
  inReview: number;
  resolved: number;
  resolutionRate: number; // Percentage (0 - 100)
}

export interface DashboardMetricsCardsProps {
  metrics: DashboardMetrics;
}

/**
 * Issue 8.2 — DashboardMetricsCards
 *
 * Responsive 4-card grid providing high-level operational KPIs for the FUSCH committee:
 * 1. Total Suggestions: Global counter with 7-day increment.
 * 2. Pending: Amber highlight for cases awaiting review.
 * 3. In Review: Blue tertiary (#001586) badge for active investigations.
 * 4. Resolved: Emerald badge with global resolution percentage.
 *
 * Adheres to Crimson Heritage: rounded-2xl, shadow-sm, and tokenized palette.
 */
export function DashboardMetricsCards({ metrics }: DashboardMetricsCardsProps) {
  const cards = [
    {
      id: "metric-total",
      title: "Total de Sugerencias",
      value: metrics.total.toLocaleString("es-PE"),
      icon: Inbox,
      iconContainerStyle: "bg-primary/10 text-primary",
      badgeText: `+${metrics.weeklyIncrement} esta semana`,
      badgeStyle: "bg-primary/10 text-primary border border-primary/20",
      badgeIcon: TrendingUp,
      ariaLabel: `Total de sugerencias: ${metrics.total}. Incremento semanal: más ${metrics.weeklyIncrement}`,
    },
    {
      id: "metric-pending",
      title: "Pendientes",
      value: metrics.pending.toLocaleString("es-PE"),
      icon: Clock,
      iconContainerStyle: "bg-amber-100 text-amber-800",
      badgeText: "Por revisar",
      badgeStyle: "bg-amber-50 text-amber-800 border border-amber-300",
      badgeIcon: Clock,
      ariaLabel: `Sugerencias pendientes: ${metrics.pending} por revisar`,
    },
    {
      id: "metric-in-review",
      title: "En Revisión",
      value: metrics.inReview.toLocaleString("es-PE"),
      icon: Eye,
      iconContainerStyle: "bg-[#001586]/10 text-tertiary",
      badgeText: "En evaluación",
      badgeStyle: "bg-[#001586]/10 text-tertiary border border-[#001586]/20",
      badgeIcon: Eye,
      ariaLabel: `Sugerencias en revisión: ${metrics.inReview} en evaluación técnica`,
    },
    {
      id: "metric-resolved",
      title: "Atendidas",
      value: metrics.resolved.toLocaleString("es-PE"),
      icon: CheckCircle2,
      iconContainerStyle: "bg-emerald-100 text-emerald-800",
      badgeText: `${metrics.resolutionRate}% resueltas`,
      badgeStyle: "bg-emerald-50 text-emerald-800 border border-emerald-300",
      badgeIcon: CheckCircle2,
      ariaLabel: `Sugerencias atendidas: ${metrics.resolved}. Tasa de resolución: ${metrics.resolutionRate}%`,
    },
  ];

  return (
    <section aria-label="Métricas Clave del Comedor">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const BadgeIcon = card.badgeIcon;

          return (
            <Card
              key={card.id}
              className="relative overflow-hidden border border-neutral-gray/20 bg-white transition-all hover:border-neutral-gray/35 hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-gray">
                    {card.title}
                  </span>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconContainerStyle}`}
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5 stroke-[2.2]" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-sans text-3xl font-extrabold tracking-tight text-gray-900">
                    {card.value}
                  </span>
                </div>

                <div className="mt-3 flex items-center">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${card.badgeStyle}`}
                  >
                    <BadgeIcon className="h-3 w-3 stroke-[2.2]" />
                    {card.badgeText}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
