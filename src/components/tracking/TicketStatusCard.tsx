"use client";

import {
  Calendar,
  CheckCircle2,
  Eye,
  MessageSquare,
  Tag,
} from "lucide-react";

import { ShiftBadge } from "@/components/common/ShiftBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getCategoryLabel } from "@/components/suggestion/CategorySelector";
import type { SuggestionRow } from "@/types/database.types";

export interface TicketStatusCardProps {
  suggestion: SuggestionRow;
  className?: string;
}

/**
 * Formats an ISO timestamp into a human-readable Spanish date-time string.
 * Uses the America/Lima timezone (UTC-5 / UTC-5, no DST).
 */
function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Lima",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const statusDescriptions: Record<string, string> = {
  pending:
    "Tu sugerencia fue recibida con éxito y está en la cola de revisión del equipo del comedor universitario.",
  in_review:
    "El equipo del comedor ya tomó nota de tu reporte y está analizando la situación para brindarte una respuesta.",
  resolved:
    "Tu sugerencia fue atendida. Revisa las respuestas del equipo en la sección inferior.",
};

const statusTimeline: Record<
  string,
  { step: number; totalSteps: number; label: string }
> = {
  pending: { step: 1, totalSteps: 3, label: "Recibido" },
  in_review: { step: 2, totalSteps: 3, label: "En revisión" },
  resolved: { step: 3, totalSteps: 3, label: "Atendido" },
};

const timelineSteps = [
  { key: "pending", label: "Recibido" },
  { key: "in_review", label: "En revisión" },
  { key: "resolved", label: "Atendido" },
] as const;

/** Visual stepper showing where the ticket sits in the review pipeline. */
function TicketTimeline({ status }: { status: string }) {
  const { step } = statusTimeline[status] ?? { step: 1 };

  return (
    <div
      role="list"
      aria-label="Progreso del ticket"
      className="flex items-center gap-0"
    >
      {timelineSteps.map((s, idx) => {
        const stepNumber = idx + 1;
        const isDone = stepNumber < step;
        const isCurrent = stepNumber === step;
        const isPending = stepNumber > step;
        const isLast = idx === timelineSteps.length - 1;

        return (
          <div key={s.key} role="listitem" className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              {/* Step indicator dot */}
              <div
                aria-current={isCurrent ? "step" : undefined}
                className={[
                  "flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  isDone
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-primary text-white ring-2 ring-primary/30 ring-offset-2"
                      : "bg-gray-100 text-gray-400",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isDone ? (
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                ) : (
                  stepNumber
                )}
              </div>
              {/* Step label */}
              <span
                className={`text-center text-[10px] font-semibold leading-none ${
                  isPending ? "text-gray-400" : isCurrent ? "text-primary" : "text-emerald-600"
                }`}
              >
                {s.label}
              </span>
            </div>

            {/* Connector line between steps */}
            {!isLast && (
              <div
                aria-hidden="true"
                className={[
                  "mb-4 h-0.5 flex-1",
                  isDone ? "bg-emerald-400" : "bg-gray-200",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Issue 7.3 — TicketStatusCard
 * Displays the full detail of a found suggestion: ticket code, status timeline,
 * category, shift, submitted date, message text.
 */
export function TicketStatusCard({
  suggestion,
  className = "",
}: TicketStatusCardProps) {
  const categoryLabel = getCategoryLabel(
    suggestion.category as Parameters<typeof getCategoryLabel>[0],
  );

  return (
    <article
      aria-label={`Ticket ${suggestion.ticket_code ?? "sin código"}`}
      className={`min-w-0 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden ${className}`}
    >
      {/* ── Header strip ── */}
      <div className="border-b border-gray-100 bg-slate-50/60 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-gray">
              Código de seguimiento
            </p>
            <span
              tabIndex={0}
              className="select-all font-mono text-2xl font-extrabold tracking-wider text-primary focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={`Código: ${suggestion.ticket_code}`}
            >
              {suggestion.ticket_code}
            </span>
          </div>

          <StatusBadge status={suggestion.status} size="md" />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="divide-y divide-gray-50">
        {/* Timeline section */}
        <section aria-labelledby="timeline-heading" className="px-5 py-5 sm:px-6">
          <h3
            id="timeline-heading"
            className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-gray"
          >
            Estado del proceso
          </h3>
          <TicketTimeline status={suggestion.status} />
          <p className="mt-4 text-xs leading-relaxed text-neutral-gray">
            {statusDescriptions[suggestion.status] ??
              "Tu sugerencia está siendo procesada."}
          </p>
        </section>

        {/* Metadata chips */}
        <section
          aria-labelledby="metadata-heading"
          className="flex flex-wrap gap-3 px-5 py-4 sm:px-6"
        >
          <h3 id="metadata-heading" className="sr-only">
            Información del reporte
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Tag className="size-3.5 shrink-0 text-neutral-gray" aria-hidden="true" />
            <span className="font-semibold">{categoryLabel}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <ShiftBadge shift={suggestion.shift} size="sm" />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Calendar className="size-3.5 shrink-0 text-neutral-gray" aria-hidden="true" />
            <time dateTime={suggestion.created_at}>
              {formatDate(suggestion.created_at)}
            </time>
          </div>
        </section>

        {/* Suggestion message */}
        <section aria-labelledby="message-heading" className="px-5 py-5 sm:px-6">
          <h3
            id="message-heading"
            className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-gray"
          >
            <MessageSquare className="size-3.5" aria-hidden="true" />
            Observación registrada
          </h3>
          <blockquote className="min-w-0 break-words rounded-xl border border-gray-100 bg-slate-50/70 px-4 py-3.5 text-sm leading-relaxed text-gray-800">
            {suggestion.message}
          </blockquote>
        </section>

        {/* Photo evidence (if any) */}
        {suggestion.photo_url && (
          <section
            aria-labelledby="photo-heading"
            className="px-5 py-5 sm:px-6"
          >
            <h3
              id="photo-heading"
              className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-gray"
            >
              Evidencia fotográfica
            </h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={suggestion.photo_url}
              alt="Evidencia fotográfica adjunta al reporte"
              className="max-h-72 w-full rounded-xl border border-gray-100 object-cover shadow-sm"
            />
          </section>
        )}

        {/* Anonymity reminder */}
        <div className="flex items-center gap-2 bg-tertiary/5 px-5 py-3 sm:px-6">
          <Eye className="size-3.5 shrink-0 text-tertiary" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-tertiary">
            <span className="font-semibold">Tu identidad está protegida.</span>{" "}
            Este ticket no contiene ni revela ningún dato personal del autor.
          </p>
        </div>
      </div>
    </article>
  );
}
