"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";

import { Button } from "@/components/common/Button";
import {
  ticketLookupSchema,
  type TicketLookupInput,
} from "@/lib/validations/ticketSchema";
import { normalizeTicketCode } from "@/lib/utils/ticket";

export interface TicketSearchBarProps {
  /** Initial code to pre-fill, e.g. from URL query param. */
  defaultCode?: string;
  /** Called with the normalized, validated code when the user submits. */
  onSearch: (code: string) => void;
  /** While a lookup is in progress the bar should appear locked. */
  isLoading?: boolean;
  className?: string;
}

export function TicketSearchBar({
  defaultCode = "",
  onSearch,
  isLoading = false,
  className = "",
}: TicketSearchBarProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TicketLookupInput>({
    resolver: zodResolver(ticketLookupSchema),
    defaultValues: { code: defaultCode },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const { ref: rhfRef, ...registerRest } = register("code");

  const handleFormSubmit = ({ code }: TicketLookupInput) => {
    onSearch(normalizeTicketCode(code));
  };

  /** Auto-uppercase and trim as the user types to guide correct entry. */
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Only uppercase, no newlines, max 10 chars.
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10);
    setValue("code", cleaned, { shouldValidate: false });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(handleFormSubmit)();
    }
  };

  const hasError = Boolean(errors.code);

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      aria-label="Buscar ticket por código"
      className={`w-full ${className}`}
    >
      <div className="space-y-3">
        {/* Label */}
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-neutral-gray"
        >
          Código de seguimiento <span className="text-primary" aria-hidden="true">*</span>
        </label>

        {/* Search input row */}
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            {/* Decorative search icon */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-neutral-gray"
            >
              <Search className="size-4" />
            </span>

            <input
              {...registerRest}
              ref={(el) => {
                rhfRef(el);
                (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
              }}
              id={inputId}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="UNSCH-XXXX"
              disabled={isLoading}
              aria-describedby={[helpId, hasError ? errorId : undefined]
                .filter(Boolean)
                .join(" ")}
              aria-invalid={hasError}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              className={[
                "min-h-12 w-full min-w-0 rounded-xl border bg-white py-3 pl-10 pr-4 font-mono text-base font-semibold tracking-widest text-gray-900 shadow-sm placeholder:font-sans placeholder:tracking-normal placeholder:text-neutral-gray/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
                "transition-colors duration-150 motion-reduce:transition-none",
                hasError
                  ? "border-primary ring-1 ring-primary/20"
                  : "border-neutral-gray/30 hover:border-neutral-gray/50",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            disabled={isLoading}
            className="shrink-0"
            aria-label="Buscar ticket"
          >
            {isLoading ? "Buscando…" : "Buscar"}
          </Button>
        </div>

        {/* Format guidance */}
        <p id={helpId} className="text-[11px] text-neutral-gray">
          Formato:{" "}
          <span className="font-mono font-semibold text-gray-700">UNSCH-</span>
          seguido de 4 caracteres (ej.{" "}
          <span className="font-mono font-semibold text-gray-700">UNSCH-K72M</span>
          ). El código se encuentra en tu modal de confirmación.
        </p>

        {/* Validation error */}
        {hasError && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            {errors.code?.message}
          </p>
        )}
      </div>
    </form>
  );
}
