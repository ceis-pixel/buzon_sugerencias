import { Inbox, SearchX } from "lucide-react";

import type { EmptyStateProps } from "@/components/common/EmptyState";

type EmptyStatePreset = Pick<EmptyStateProps, "icon" | "title" | "description">;

export const emptyStatePresets = {
  ticketNotFound: {
    icon: SearchX,
    title: "No encontramos este ticket",
    description: "Verifica que el código ingresado (ej. UNSCH-A39B) esté escrito correctamente o intenta nuevamente.",
  },
  inboxClear: {
    icon: Inbox,
    title: "Bandeja al día",
    description: "No hay sugerencias pendientes de revisión para este turno en este momento.",
  },
} as const satisfies Record<string, EmptyStatePreset>;
