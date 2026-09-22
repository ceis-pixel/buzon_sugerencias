"use client";

import { useRef, useState } from "react";

import { AlertBanner } from "@/components/common/AlertBanner";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Textarea } from "@/components/common/Textarea";

export function FormFieldsShowcase() {
  const [ticketCode, setTicketCode] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const ticketInput = useRef<HTMLInputElement>(null);
  const suggestionInput = useRef<HTMLTextAreaElement>(null);
  const ticketError = /^UNSCH-[A-Z0-9]{4}$/.test(ticketCode.trim()) ? undefined : "Usa el formato de ejemplo UNSCH-A39B: prefijo UNSCH- y cuatro letras o números en mayúscula.";
  const suggestionError = suggestion.trim().length >= 20 ? undefined : "Cuéntanos un poco más: escribe al menos 20 caracteres para explicar tu idea.";

  return (
    <section aria-labelledby="fields-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 id="fields-title" className="text-lg font-semibold text-primary">Campos con ayuda en cada paso</h2>
      <p className="text-sm leading-6">Prueba las indicaciones y el contador. Este formulario es ficticio y no envía información.</p>
      <form noValidate className="space-y-5" onSubmit={(event) => {
        event.preventDefault();
        setIsSubmitted(true);
        setIsValid(!ticketError && !suggestionError);
        if (ticketError) ticketInput.current?.focus();
        else if (suggestionError) suggestionInput.current?.focus();
      }} onReset={() => { setTicketCode(""); setSuggestion(""); setIsSubmitted(false); setIsValid(false); }}>
        <Input
          ref={ticketInput}
          label="Código de ticket de ejemplo"
          name="ticketCode"
          required
          value={ticketCode}
          autoCapitalize="characters"
          spellCheck={false}
          onChange={(event) => { setTicketCode(event.target.value); setIsValid(false); }}
          placeholder="UNSCH-A39B"
          helperText="El formato se valida solo para esta demostración."
          error={isSubmitted ? ticketError : undefined}
        />
        <Textarea
          ref={suggestionInput}
          label="Tu propuesta de mejora"
          name="suggestion"
          required
          value={suggestion}
          onChange={(event) => { setSuggestion(event.target.value); setIsValid(false); }}
          minLength={20}
          maxLength={300}
          helperText="Describe una mejora sin incluir datos personales. Máximo 300 caracteres."
          error={isSubmitted ? suggestionError : undefined}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Validar ejemplo</Button>
          <Button type="reset" variant="ghost">Limpiar campos</Button>
        </div>
        {isSubmitted && (isValid ? (
          <AlertBanner variant="success" title="Ejemplo validado" description="Los campos están completos. No se ha enviado ni guardado tu propuesta." />
        ) : (ticketError || suggestionError) ? (
          <AlertBanner variant="error" title="Revisa los campos indicados" description="Sigue la ayuda debajo de cada campo y vuelve a validar el ejemplo." />
        ) : null)}
      </form>
    </section>
  );
}
