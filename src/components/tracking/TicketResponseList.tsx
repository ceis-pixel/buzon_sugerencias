"use client";

import { Calendar, MessageCircle, UserCheck } from "lucide-react";

import type { TicketResponse } from "@/types/database.types";

export interface TicketResponseListProps {
  responses: TicketResponse[];
  className?: string;
}

/**
 * Formats an ISO timestamp to a human-readable Spanish string.
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

/**
 * Issue 7.4 — TicketResponseList
 * Renders the list of non-internal public responses from the comedor team.
 * Shows an empty state when no responses exist yet.
 */
export function TicketResponseList({
  responses,
  className = "",
}: TicketResponseListProps) {
  if (responses.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-gray-200 bg-slate-50/60 px-5 py-8 text-center ${className}`}
      >
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-gray-100">
          <MessageCircle
            className="size-5 text-neutral-gray"
            aria-hidden="true"
          />
        </div>
        <p className="text-sm font-semibold text-gray-700">
          Aún no hay respuestas
        </p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-gray">
          El equipo del comedor universitario revisará tu reporte pronto. Puedes
          volver a consultar este código en cualquier momento.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label={`${responses.length} respuesta${responses.length !== 1 ? "s" : ""} del equipo`}
      className={`space-y-4 ${className}`}
    >
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-gray">
        <MessageCircle className="size-3.5" aria-hidden="true" />
        Respuesta{responses.length !== 1 ? "s" : ""} del equipo (
        {responses.length})
      </h3>

      <ol className="space-y-4" aria-label="Respuestas del comedor">
        {responses.map((response, index) => (
          <li
            key={response.id}
            className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm"
          >
            {/* Response header */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  aria-hidden="true"
                  className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                >
                  <UserCheck className="size-3.5" />
                </div>
                <span className="text-xs font-semibold text-emerald-800">
                  Equipo del Comedor Universitario
                </span>
              </div>
              <span className="text-[11px] text-neutral-gray">
                Respuesta {index + 1}
              </span>
            </div>

            {/* Response text */}
            <p className="min-w-0 break-words text-sm leading-relaxed text-gray-800">
              {response.response_text}
            </p>

            {/* Timestamp */}
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-neutral-gray">
              <Calendar className="size-3 shrink-0" aria-hidden="true" />
              <time dateTime={response.created_at}>
                {formatDate(response.created_at)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
