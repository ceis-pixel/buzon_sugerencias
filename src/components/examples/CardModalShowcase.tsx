"use client";

import { ArrowRight, MessageSquareText } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/Card";
import { Modal, type ModalProps } from "@/components/common/Modal";
import { ShiftBadge } from "@/components/common/ShiftBadge";

const sizes: { value: NonNullable<ModalProps["size"]>; label: string }[] = [
  { value: "sm", label: "Pequeño" }, { value: "md", label: "Mediano" },
  { value: "lg", label: "Grande" }, { value: "full", label: "Ancho completo" },
];

export function CardModalShowcase() {
  const [isOpen, setIsOpen] = useState(false);
  const [size, setSize] = useState<NonNullable<ModalProps["size"]>>("md");
  const [showCloseButton, setShowCloseButton] = useState(true);
  const [showLongContent, setShowLongContent] = useState(false);
  const [message, setMessage] = useState("Las acciones de esta vitrina son de demostración.");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <CardTitle>Un espacio para escucharte</CardTitle>
            <CardDescription>Contenedores claros para compartir y consultar información.</CardDescription>
          </div>
          <MessageSquareText aria-hidden="true" className="size-6 shrink-0 text-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6">Comparte ideas para mejorar el comedor universitario. Prueba la ventana de ejemplo para conocer su funcionamiento.</p>
          <div className="mt-4 space-y-3">
            <label htmlFor="demo-modal-size" className="block text-sm font-semibold text-primary">Tamaño de la ventana</label>
            <select id="demo-modal-size" value={size} onChange={(event) => {
              const selected = sizes.find((item) => item.value === event.target.value);
              if (selected) setSize(selected.value);
            }} className="min-h-11 w-full rounded-xl border border-secondary/30 bg-white px-3 text-sm text-primary">
              {sizes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showCloseButton} onChange={(event) => setShowCloseButton(event.target.checked)} className="size-4 accent-primary" />Mostrar botón de cierre</label>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showLongContent} onChange={(event) => setShowLongContent(event.target.checked)} className="size-4 accent-primary" />Probar contenido extenso</label>
          </div>
        </CardContent>
        <CardFooter withBorder>
          <Button onClick={() => setIsOpen(true)} rightIcon={<ArrowRight />}>Abrir ventana de prueba</Button>
        </CardFooter>
      </Card>

      <Card variant="interactive" className="relative">
        <CardHeader>
          <div className="space-y-2">
            <CardTitle id="lunch-card-title">Conoce el turno de almuerzo</CardTitle>
            <CardDescription id="lunch-card-description">Un acceso directo de ejemplo con soporte de teclado.</CardDescription>
          </div>
          <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-primary" />
        </CardHeader>
        <CardContent><ShiftBadge shift="lunch" /></CardContent>
        <button type="button" aria-labelledby="lunch-card-title" aria-describedby="lunch-card-description" onClick={() => setIsOpen(true)} className="absolute inset-0 min-h-11 w-full cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2" />
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="bordered" padding="sm"><CardTitle as="h3">Borde delimitado</CardTitle><CardContent className="mt-2"><Badge variant="outline">Información complementaria</Badge></CardContent></Card>
        <Card variant="ghost" padding="sm"><CardTitle as="h3">Contenedor discreto</CardTitle><CardDescription className="mt-2">Agrupa información sobre el fondo de la página.</CardDescription></Card>
      </div>
      <p role="status" className="text-sm leading-6">{message}</p>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Comparte una idea de prueba"
        description="Este formulario es ficticio. Su contenido no se envía ni se guarda."
        size={size}
        showCloseButton={showCloseButton}
        footer={<>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button type="submit" form="demo-suggestion-form">Confirmar prueba</Button>
        </>}
      >
        <form id="demo-suggestion-form" onSubmit={(event) => {
          event.preventDefault(); setMessage("Prueba completada. No se ha enviado ni guardado información."); setIsOpen(false);
        }} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="demo-suggestion" className="block text-sm font-semibold text-primary">Tu idea</label>
            <textarea id="demo-suggestion" rows={3} placeholder="Escribe una idea para mejorar el comedor" className="w-full resize-y rounded-xl border border-secondary/30 p-3 text-base text-primary" />
          </div>
          <p className="text-sm leading-6">Puedes cerrar esta ventana con Escape, el botón de cierre, Cancelar o un clic fuera del contenedor.</p>
          {showLongContent && Array.from({ length: 8 }, (_, index) => (
            <p key={index} className="text-sm leading-6">Ejemplo {index + 1}: las sugerencias ayudan a identificar oportunidades para mejorar la atención, los alimentos y los espacios del comedor universitario.</p>
          ))}
        </form>
      </Modal>
    </div>
  );
}
