"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { STATUS_DISPLAY, STATUS_ORDER } from "@/components/admin/inboxLabels";
import { updateSuggestionStatus } from "@/lib/actions/adminActions";
import type { SuggestionRow, TicketStatus } from "@/types/database.types";

export interface StatusQuickSelectProps {
  suggestionId: string;
  ticketCode: string | null;
  status: TicketStatus;
  onStatusChange: (suggestionId: string, status: TicketStatus, updatedRow: SuggestionRow) => void;
  size?: "sm" | "md";
}

/**
 * Status badge that doubles as a selector, for triage without opening the
 * report. The change is applied optimistically and reverted if the server
 * rejects it.
 */
export function StatusQuickSelect({
  suggestionId,
  ticketCode,
  status,
  onStatusChange,
  size = "sm",
}: StatusQuickSelectProps) {
  const [optimisticStatus, setOptimisticStatus] = useState<TicketStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shownStatus = optimisticStatus ?? status;
  const isSaving = optimisticStatus !== null;

  const handleChange = async (nextStatus: TicketStatus) => {
    if (nextStatus === status || isSaving) return;

    setError(null);
    setOptimisticStatus(nextStatus);

    try {
      const result = await updateSuggestionStatus(suggestionId, nextStatus);
      if (result.success && result.data) {
        onStatusChange(suggestionId, nextStatus, result.data);
      } else {
        setError(result.error ?? "No se pudo actualizar el estado.");
      }
    } catch {
      setError("No se pudo actualizar el estado.");
    } finally {
      setOptimisticStatus(null);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="relative inline-flex">
        <select
          value={shownStatus}
          disabled={isSaving}
          aria-label={`Estado del reporte ${ticketCode ?? "sin código"}`}
          onChange={(event) => handleChange(event.target.value as TicketStatus)}
          className={`cursor-pointer appearance-none rounded-full border font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-wait disabled:opacity-60 ${
            size === "md" ? "min-h-11 py-2 pl-4 pr-9 text-sm" : "py-1 pl-3 pr-7 text-xs"
          } ${STATUS_DISPLAY[shownStatus].tone}`}
        >
          {STATUS_ORDER.map((option) => (
            <option key={option} value={option} className="bg-white text-gray-900">
              {STATUS_DISPLAY[option].label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 opacity-70 ${
            size === "md" ? "right-3 size-4" : "right-2 size-3.5"
          }`}
        />
      </span>
      {error && (
        <span role="alert" className="max-w-[12rem] text-[11px] font-semibold text-primary">
          {error}
        </span>
      )}
    </span>
  );
}
