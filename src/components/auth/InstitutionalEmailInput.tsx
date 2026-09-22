"use client";

import { useEffect, type ChangeEvent } from "react";

import { InstitutionalFeedbackBox } from "@/components/auth/InstitutionalFeedbackBox";
import { Input, type InputProps } from "@/components/common/Input";
import { useInstitutionalEmail } from "@/lib/hooks/useInstitutionalEmail";

export interface InstitutionalEmailInputProps
  extends Omit<InputProps, "error" | "onChange" | "value"> {
  value?: string;
  onEmailChange?: (email: string, isValid: boolean) => void;
  onValidationChange?: (isValid: boolean) => void;
  showFeedbackBox?: boolean;
}

/**
 * Institutional email input with reactive crimson border mutation and pedagogical feedback box,
 * conforming strictly to Section 4.1 of the Crimson Heritage Design System.
 */
export function InstitutionalEmailInput({
  label = "Correo institucional",
  helperText = "Ingresa tu cuenta asignada por la universidad (ej. 28190012@unsch.edu.pe)",
  placeholder = "estudiante@unsch.edu.pe",
  value,
  onEmailChange,
  onValidationChange,
  showFeedbackBox = true,
  className = "",
  id = "institutional-email",
  ...props
}: InstitutionalEmailInputProps) {
  const {
    email,
    setEmail,
    isValidDomain,
    isDomainError,
    handleBlur,
  } = useInstitutionalEmail(value ?? "");

  // Notify parent of state changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isValidDomain);
    }
  }, [isValidDomain, onValidationChange]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setEmail(nextValue);
    if (onEmailChange) {
      const clean = nextValue.trim().toLowerCase();
      const isValid = clean.endsWith("@unsch.edu.pe") && clean.length > "@unsch.edu.pe".length;
      onEmailChange(nextValue, isValid);
    }
  }

  const borderClass = isDomainError
    ? "!border-primary focus-visible:!ring-primary/40 focus:!border-primary"
    : isValidDomain
      ? "!border-emerald-600 focus-visible:!ring-emerald-500/30"
      : "";

  return (
    <div className="space-y-2">
      <Input
        {...props}
        id={id}
        type="email"
        label={label}
        placeholder={placeholder}
        helperText={isDomainError ? undefined : helperText}
        value={value !== undefined ? value : email}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={isDomainError}
        className={`transition-colors duration-200 ${borderClass} ${className}`}
      />

      {isDomainError && showFeedbackBox && (
        <div className="pt-1 animate-fade-in">
          <InstitutionalFeedbackBox />
        </div>
      )}
    </div>
  );
}
