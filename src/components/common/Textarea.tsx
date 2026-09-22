import { useId, type Ref, type TextareaHTMLAttributes } from "react";

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue"> {
  label: string;
  value: string;
  helperText?: string;
  error?: string;
  showCount?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ label, value, helperText, error, showCount = true, id, rows = 4, className = "", "aria-describedby": describedBy, "aria-invalid": invalid, ...props }: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionIds = [describedBy, helperText && `${inputId}-help`, error && `${inputId}-error`, showCount && `${inputId}-count`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-primary">{label}{props.required && <span> (obligatorio)</span>}</label>
      <textarea
        {...props}
        id={inputId}
        rows={rows}
        value={value}
        aria-describedby={descriptionIds}
        aria-invalid={error ? true : invalid}
        className={`block w-full min-w-0 resize-y rounded-xl border bg-white px-3 py-2 font-sans text-base text-gray-900 shadow-sm placeholder:text-neutral-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${error ? "border-primary" : "border-neutral-gray/30"} ${className}`}
      />
      {helperText && <p id={`${inputId}-help`} className="text-sm text-neutral-gray">{helperText}</p>}
      {error && <p id={`${inputId}-error`} className="text-sm font-medium text-primary">{error}</p>}
      {showCount && <p id={`${inputId}-count`} className="text-right text-xs text-neutral-gray">{value.length}{props.maxLength !== undefined ? ` de ${props.maxLength}` : ""} caracteres</p>}
    </div>
  );
}
