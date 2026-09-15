"use client";

import { Bell } from "lucide-react";
import { useState } from "react";

import { Badge, type BadgeProps } from "@/components/common/Badge";
import { ShiftBadge, type MealShift } from "@/components/common/ShiftBadge";
import { StatusBadge, type TicketStatus } from "@/components/common/StatusBadge";

const variants = [
  { variant: "primary", label: "Institucional" },
  { variant: "secondary", label: "Complementario" },
  { variant: "tertiary", label: "Aviso del sistema" },
  { variant: "neutral", label: "Información general" },
  { variant: "success", label: "Completado" },
  { variant: "warning", label: "Por confirmar" },
  { variant: "outline", label: "Solo borde" },
] satisfies { variant: BadgeProps["variant"]; label: string }[];

const statuses: TicketStatus[] = ["pending", "in_review", "resolved"];
const shifts: MealShift[] = ["breakfast", "lunch", "dinner"];

export function BadgeShowcase() {
  const [selectedShift, setSelectedShift] = useState<MealShift>("lunch");
  const [status, setStatus] = useState<TicketStatus>("pending");

  return (
    <div className="space-y-6">
      <section aria-labelledby="badge-variants-title" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 id="badge-variants-title" className="text-lg font-semibold text-secondary">Indicadores de un vistazo</h2>
        <p className="mt-2 text-sm leading-6">Etiquetas compactas para identificar información, avisos y resultados.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {variants.map(({ variant, label }) => <Badge key={variant} variant={variant}>{label}</Badge>)}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
          <Badge withDot>Indicador pequeño</Badge>
          <Badge variant="tertiary" size="md" withDot pulse>Actividad de prueba</Badge>
          <Badge variant="outline" size="md" icon={<Bell />}>Aviso con icono</Badge>
        </div>
        <p className="mt-3 text-xs leading-5">El indicador animado respeta la preferencia de movimiento reducido.</p>
      </section>

      <section aria-labelledby="ticket-statuses-title" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 id="ticket-statuses-title" className="text-lg font-semibold text-secondary">Estados de los tickets</h2>
        <p className="mt-2 text-sm leading-6">Cada estado combina una etiqueta, un color y un icono.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {statuses.map((value) => <StatusBadge key={value} status={value} />)}
        </div>
        <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
          <label htmlFor="demo-ticket-status" className="block text-sm font-semibold text-primary">Cambiar estado de prueba</label>
          <select
            id="demo-ticket-status"
            value={status}
            onChange={(event) => {
              const value = statuses.find((item) => item === event.target.value);
              if (value) setStatus(value);
            }}
            className="min-h-11 w-full rounded-xl border border-secondary/30 bg-white px-3 py-2 text-sm text-primary"
          >
            <option value="pending">Pendiente</option>
            <option value="in_review">En revisión</option>
            <option value="resolved">Atendido</option>
          </select>
          <div role="status" aria-atomic="true" className="flex flex-wrap items-center gap-2 text-sm">
            Estado de prueba: <StatusBadge status={status} size="md" />
          </div>
        </div>
      </section>

      <section aria-labelledby="meal-shifts-title" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 id="meal-shifts-title" className="text-lg font-semibold text-secondary">Turnos del comedor</h2>
        <p className="mt-4 text-xs font-medium">Presentación normal</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {shifts.map((shift) => <ShiftBadge key={shift} shift={shift} />)}
        </div>
        <p className="mt-4 text-xs font-medium">Presentación seleccionada</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {shifts.map((shift) => <ShiftBadge key={shift} shift={shift} isSelected />)}
        </div>
        <div role="group" aria-label="Elegir turno de prueba" className="mt-5 border-t border-gray-100 pt-5">
          <p className="text-sm leading-6">Selecciona un turno para probar el filtro.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {shifts.map((shift) => (
              <button
                key={shift}
                type="button"
                aria-pressed={selectedShift === shift}
                onClick={() => setSelectedShift(shift)}
                className="inline-flex min-h-11 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                <ShiftBadge shift={shift} isSelected={selectedShift === shift} size="md" />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
