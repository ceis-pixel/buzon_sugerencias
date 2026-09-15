"use client";

import { ArrowRight, Bell, Search, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/common/Button";

export function ButtonShowcase() {
  const [message, setMessage] = useState("Selecciona un botón para probar su respuesta.");
  const [isLoading, setIsLoading] = useState(false);
  const [actionCount, setActionCount] = useState(0);

  function handleAction(label: string) {
    const nextCount = actionCount + 1;
    setActionCount(nextCount);
    setMessage(`${label}. Acciones realizadas: ${nextCount}.`);
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="button-variants-title" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 id="button-variants-title" className="text-lg font-semibold text-secondary">Una acción, una intención</h2>
        <p className="mt-2 text-sm leading-6">Prueba los estilos del comedor universitario. Estas acciones son de demostración.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium">Primario · Acción principal</p>
            <Button leftIcon={<Send />} onClick={() => handleAction("Sugerencia de prueba seleccionada")}>Enviar sugerencia</Button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium">Secundario · Acción complementaria</p>
            <Button id="ticket-lookup" variant="secondary" rightIcon={<Search />} className="scroll-mt-24" onClick={() => handleAction("Consulta de prueba seleccionada")}>Consultar ticket</Button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium">Terciario · Avisos del sistema</p>
            <Button variant="tertiary" leftIcon={<Bell />} onClick={() => handleAction("Avisos de prueba seleccionados")}>Ver avisos</Button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium">Discreto · Acción auxiliar</p>
            <Button variant="ghost" onClick={() => handleAction("Acción auxiliar seleccionada")}>Volver</Button>
          </div>
        </div>
        <p role="status" aria-atomic="true" className="mt-6 rounded-xl border border-tertiary/20 bg-tertiary/5 p-3 text-sm leading-6 text-tertiary">{message}</p>
      </section>

      <section aria-labelledby="button-states-title" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 id="button-states-title" className="text-lg font-semibold text-secondary">Estados y respuesta</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button isLoading>Cargando</Button>
          <Button disabled onClick={() => handleAction("Esta acción no debe ejecutarse")}>No disponible</Button>
        </div>
        <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
          <Button fullWidth isLoading={isLoading} leftIcon={<Send />} onClick={() => { setIsLoading(true); setMessage("Carga de prueba iniciada. Puedes finalizarla con el control inferior."); }}>
            {isLoading ? "Enviando sugerencia" : "Probar envío a ancho completo"}
          </Button>
          <Button variant="ghost" size="sm" disabled={!isLoading} onClick={() => { setIsLoading(false); setMessage("Carga de prueba finalizada. El botón vuelve a estar disponible."); }}>Finalizar carga de prueba</Button>
        </div>
      </section>

      <section aria-labelledby="button-sizes-title" className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 id="button-sizes-title" className="text-lg font-semibold text-secondary">Tamaños y navegación</h2>
        <p className="mt-2 text-sm leading-6">Controles con un área táctil mínima de 44 píxeles para usarlos desde el celular.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => handleAction("Tamaño pequeño seleccionado")}>Pequeño</Button>
          <Button size="md" onClick={() => handleAction("Tamaño mediano seleccionado")}>Mediano</Button>
          <Button size="lg" onClick={() => handleAction("Tamaño grande seleccionado")}>Grande</Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
          <Button as="a" href="#button-variants-title" variant="secondary" rightIcon={<ArrowRight />}>Volver a las variantes</Button>
          <Button as="a" href="#button-variants-title" variant="ghost" disabled>Enlace no disponible</Button>
        </div>
      </section>
    </div>
  );
}
