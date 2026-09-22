"use client";

import { Bell } from "lucide-react";
import { useRef, useState } from "react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { Button } from "@/components/common/Button";

export function AlertBannerShowcase() {
  const [noticeVersion, setNoticeVersion] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const restoreButton = useRef<HTMLButtonElement>(null);

  return (
    <section id="system-notices" aria-labelledby="alerts-title" className="scroll-mt-24 space-y-4">
      <h2 id="alerts-title" className="text-lg font-semibold text-primary">Avisos que te orientan</h2>
      <p className="text-sm leading-6">El azul identifica mensajes de la plataforma. Todos los avisos de esta sección son ejemplos; no describen el estado real del servicio.</p>
      <AlertBanner
        key={noticeVersion}
        title="Aviso de la plataforma"
        description="Ejemplo de mantenimiento: si una consulta tarda en responder, conserva tu código e inténtalo nuevamente en unos minutos."
        icon={Bell}
        action={{ label: "Ir a la consulta de prueba", href: "#empty-state-ticket-code" }}
        onClose={() => { setIsDismissed(true); restoreButton.current?.focus(); }}
      />
      <Button ref={restoreButton} variant="ghost" size="sm" onClick={() => { setNoticeVersion((version) => version + 1); setIsDismissed(false); }}>
        {isDismissed ? "Volver a mostrar el aviso" : "Reiniciar aviso de prueba"}
      </Button>
      <AlertBanner
        variant="error"
        title="No pudimos completar la consulta de prueba"
        description="Tu código sigue disponible. Puedes volver a intentarlo sin registrar una nueva sugerencia."
        action={{ label: "Reintentar consulta de prueba", onClick: () => setRetryCount((count) => count + 1) }}
      />
      <p role="status" aria-atomic="true" className="text-sm">{retryCount ? `Reintentos simulados: ${retryCount}. No se consultaron datos reales.` : "Puedes probar el botón para conocer su respuesta."}</p>
      <AlertBanner variant="warning" title="Revisa tu mensaje antes de continuar" description="Para cuidar tu privacidad, evita incluir tu nombre, DNI o datos personales en la sugerencia." />
      <AlertBanner variant="success" title="Prueba completada" description="Así se verá una confirmación del sistema. En esta vitrina no se envía ni guarda información." />
      <AlertBanner variant="info" title="Una idea puede ayudar" description={<>Describe lo que observaste y propone una mejora concreta. <strong>No necesitas incluir datos personales.</strong></>} />
    </section>
  );
}
