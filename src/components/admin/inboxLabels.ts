import type { SuggestionCategory, TicketStatus } from "@/types/database.types";

/** Compact category names and semantic tones used across the inspection console. */
export const CATEGORY_DISPLAY: Record<SuggestionCategory, { label: string; tone: string }> = {
  hygiene: { label: "Higiene", tone: "border-primary/30 bg-primary/10 text-primary" },
  menu: { label: "Menú", tone: "border-secondary/30 bg-secondary/10 text-secondary" },
  portion: { label: "Cantidad", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  service: { label: "Trato", tone: "border-tertiary/20 bg-tertiary/10 text-tertiary" },
  infrastructure: {
    label: "Infraestructura",
    tone: "border-neutral-gray/25 bg-neutral-gray/10 text-gray-700",
  },
};

/** Order in which categories are offered as filters: hygiene first, as the critical one. */
export const CATEGORY_FILTER_ORDER: readonly SuggestionCategory[] = [
  "hygiene",
  "menu",
  "portion",
  "service",
  "infrastructure",
];

export const STATUS_DISPLAY: Record<TicketStatus, { label: string; tone: string }> = {
  pending: { label: "Pendiente", tone: "border-amber-300 bg-amber-50 text-amber-800" },
  in_review: { label: "En Revisión", tone: "border-tertiary/30 bg-tertiary/10 text-tertiary" },
  resolved: { label: "Atendido", tone: "border-emerald-300 bg-emerald-50 text-emerald-800" },
};

export const STATUS_ORDER: readonly TicketStatus[] = ["pending", "in_review", "resolved"];
