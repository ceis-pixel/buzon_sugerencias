"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { emptyStatePresets } from "@/components/common/emptyStatePresets";

export function EmptyStateShowcase() {
  const [searchCount, setSearchCount] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);

  return (
    <div className="space-y-6">
      <EmptyState
        {...emptyStatePresets.ticketNotFound}
        action={{
          label: "Buscar otro ticket",
          href: "#empty-state-ticket-code",
          icon: Search,
        }}
      />

      <form
        id="empty-state-ticket-search"
        className="scroll-mt-24 space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        onSubmit={(event) => { event.preventDefault(); setSearchCount((count) => count + 1); }}
      >
        <label htmlFor="empty-state-ticket-code" className="block text-sm font-semibold text-primary">Código de ticket de prueba</label>
        <p id="empty-state-search-help" className="text-sm leading-6">Puedes probar esta interacción sin consultar ni guardar datos reales.</p>
        <input
          id="empty-state-ticket-code"
          aria-describedby="empty-state-search-help"
          placeholder="Ej. UNSCH-A39B"
          className="min-h-11 w-full scroll-mt-24 rounded-xl border border-secondary/30 bg-white px-3 py-2 text-base text-primary"
        />
        <Button type="submit" leftIcon={<Search />}>Probar búsqueda</Button>
        <p role="status" aria-atomic="true" className="text-sm leading-6">
          {searchCount > 0 ? `Búsqueda de prueba completada. Intentos: ${searchCount}. Revisa el código e inténtalo nuevamente.` : "La búsqueda de esta vitrina es una simulación."}
        </p>
      </form>

      <EmptyState
        {...emptyStatePresets.inboxClear}
        variant="plain"
        secondaryAction={{ label: "Refrescar datos", onClick: () => setRefreshCount((count) => count + 1) }}
      />
      <p role="status" aria-atomic="true" className="text-center text-sm leading-6 text-neutral-gray">
        {refreshCount > 0 ? `Bandeja de prueba actualizada. Actualizaciones: ${refreshCount}. Por ahora no hay sugerencias pendientes.` : "La bandeja mostrada es de demostración."}
      </p>
    </div>
  );
}
