"use client";

import {
  forwardRef,
  useId,
  useState,
  useEffect,
  type ChangeEvent,
  type TextareaHTMLAttributes,
} from "react";
import { AlertCircle } from "lucide-react";

export interface SuggestionMessageFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "maxLength"> {
  label?: string;
  subLabel?: string;
  helperText?: string;
  errorMessage?: string;
  maxLength?: number;
  className?: string;
}

export const SuggestionMessageField = forwardRef<
  HTMLTextAreaElement,
  SuggestionMessageFieldProps
>(function SuggestionMessageField(
  {
    label = "Detalle de tu observación",
    subLabel = "Sé claro y específico sobre lo ocurrido",
    placeholder = "Describe el inconveniente o sugerencia con el menú, la porción, la atención o el estado del comedor...",
    helperText,
    errorMessage,
    maxLength = 500,
    value,
    defaultValue,
    onChange,
    id,
    rows = 4,
    disabled = false,
    className = "",
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const countId = `${inputId}-count`;

  // Track character count supporting both controlled and uncontrolled usage
  const [internalLength, setInternalLength] = useState<number>(() => {
    if (typeof value === "string") return value.length;
    if (typeof defaultValue === "string") return defaultValue.length;
    return 0;
  });

  useEffect(() => {
    if (typeof value === "string") {
      setInternalLength(value.length);
    }
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInternalLength(event.target.value.length);
    onChange?.(event);
  };

  const hasError = Boolean(errorMessage);

  // Counter styling transitions according to Crimson Heritage specifications
  let counterColorClass = "text-neutral-gray";
  if (internalLength >= maxLength) {
    counterColorClass = "text-primary font-bold";
  } else if (internalLength >= 450) {
    counterColorClass = "text-amber-700 font-semibold";
  }

  const ariaDescribedBy = [
    hasError ? errorId : helperText ? helpId : undefined,
    countId,
    props["aria-describedby"],
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Field Label & Didactic Sub-label */}
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <label
          htmlFor={inputId}
          className="text-sm font-bold text-gray-900"
        >
          {label}
          {props.required && <span className="text-primary font-semibold"> *</span>}
        </label>
        {subLabel && (
          <span className="text-xs text-neutral-gray">
            {subLabel}
          </span>
        )}
      </div>

      {/* Main Textarea Input */}
      <div className="relative">
        <textarea
          {...props}
          ref={ref}
          id={inputId}
          rows={rows}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={hasError}
          aria-describedby={ariaDescribedBy}
          className={[
            "block w-full min-w-0 resize-y rounded-xl p-3 sm:p-3.5 font-sans text-sm sm:text-base leading-relaxed text-gray-900 shadow-sm transition-all duration-150",
            "placeholder:text-neutral-gray/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
            hasError
              ? "border-2 border-primary bg-red-50/10 ring-1 ring-primary/20 focus-visible:ring-2 focus-visible:ring-primary/40"
              : "border border-gray-200 bg-white hover:border-secondary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          ].join(" ")}
        />
      </div>

      {/* Bottom Bar: Feedback and Live Visual Counter */}
      <div className="flex items-start justify-between gap-3 pt-0.5">
        <div className="min-w-0 flex-1">
          {hasError ? (
            <div
              id={errorId}
              role="alert"
              className="flex items-center gap-1.5 text-xs font-semibold text-primary"
            >
              <AlertCircle className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          ) : helperText ? (
            <p id={helpId} className="text-xs text-neutral-gray">
              {helperText}
            </p>
          ) : (
            <p id={helpId} className="text-xs text-neutral-gray">
              Mínimo 10 caracteres útiles para que el equipo del comedor pueda atender tu caso.
            </p>
          )}
        </div>

        {/* Live Visual Counter */}
        <span
          id={countId}
          aria-live="polite"
          className={`shrink-0 text-xs tabular-nums transition-colors duration-150 ${counterColorClass}`}
        >
          {internalLength}/{maxLength} caracteres
        </span>
      </div>
    </div>
  );
});
