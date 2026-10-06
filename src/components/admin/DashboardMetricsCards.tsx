"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  type LucideIcon,
} from "lucide-react";

import type { DashboardMetrics } from "@/lib/services/suggestionService";
import type { TicketStatus } from "@/types/database.types";

export type { DashboardMetrics };

export interface DashboardMetricsCardsProps {
  metrics: DashboardMetrics;
  /** Status the inbox is currently filtered by; marks the matching card. */
  activeStatus: TicketStatus | "all";
  onSelectStatus: (status: TicketStatus | "all") => void;
}

/** Above this many unreviewed reports the pending card switches to its alert state. */
export const PENDING_ALERT_THRESHOLD = 5;

interface MetricCard {
  status: TicketStatus | "all";
  title: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  accent: string;
  iconTone: string;
  detailTone: string;
}

/**
 * KPI strip of the inspection console. Each card is also a shortcut that
 * filters the inbox by its status.
 */
export function DashboardMetricsCards({
  metrics,
  activeStatus,
  onSelectStatus,
}: DashboardMetricsCardsProps) {
  const isPendingAlert = metrics.pending > PENDING_ALERT_THRESHOLD;

  const cards: MetricCard[] = [
    {
      status: "all",
      title: "Total de Reportes",
      value: metrics.total,
      detail: `+${metrics.weeklyIncrement} en los últimos 7 días`,
      icon: Inbox,
      accent: "bg-primary",
      iconTone: "bg-primary/10 text-primary",
      detailTone: "text-neutral-gray",
    },
    {
      status: "pending",
      title: "Pendientes de Atención",
      value: metrics.pending,
      detail: isPendingAlert
        ? `Más de ${PENDING_ALERT_THRESHOLD} sin revisar`
        : metrics.pending === 0
          ? "Bandeja al día"
          : "Por revisar",
      icon: isPendingAlert ? AlertTriangle : Clock,
      accent: isPendingAlert ? "bg-primary" : "bg-amber-400",
      iconTone: isPendingAlert ? "bg-primary text-white" : "bg-amber-100 text-amber-800",
      detailTone: isPendingAlert ? "font-bold text-primary" : "text-amber-800",
    },
    {
      status: "in_review",
      title: "En Evaluación",
      value: metrics.inReview,
      detail: "En trámite",
      icon: Eye,
      accent: "bg-tertiary",
      iconTone: "bg-tertiary/10 text-tertiary",
      detailTone: "text-tertiary",
    },
    {
      status: "resolved",
      title: "Atendidos",
      value: metrics.resolved,
      detail: `${metrics.weeklyResolutionRate}% resuelto esta semana`,
      icon: CheckCircle2,
      accent: "bg-emerald-500",
      iconTone: "bg-emerald-100 text-emerald-800",
      detailTone: "text-emerald-800",
    },
  ];

  return (
    <section aria-label="Resumen de reportes">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const isActive = activeStatus === card.status;

          return (
            <button
              key={card.status}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectStatus(card.status)}
              className={`relative overflow-hidden rounded-2xl border bg-white p-3.5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:p-4 ${
                isActive ? "border-gray-900/40 ring-1 ring-gray-900/10" : "border-neutral-gray/20"
              } ${card.status === "pending" && isPendingAlert ? "bg-primary/[0.03]" : ""}`}
            >
              <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${card.accent}`} />

              <span className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold uppercase leading-tight tracking-wider text-neutral-gray">
                  {card.title}
                </span>
                <span
                  aria-hidden="true"
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${card.iconTone}`}
                >
                  <Icon className="size-4" />
                </span>
              </span>

              <span className="mt-1 block text-2xl font-extrabold tabular-nums tracking-tight text-gray-900 sm:text-3xl">
                {card.value.toLocaleString("es-PE")}
              </span>

              <span className={`mt-1 block text-[11px] font-semibold leading-tight ${card.detailTone}`}>
                {card.detail}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
