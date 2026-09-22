import { useId, type InputHTMLAttributes, type Ref } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, helperText, error, id, className = "", "aria-describedby": describedBy, "aria-invalid": invalid, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionIds = [describedBy, helperText && `${inputId}-help`, error && `${inputId}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-primary">{label}{props.required && <span> (obligatorio)</span>}</label>
      <input
        {...props}
        id={inputId}
        aria-describedby={descriptionIds}
        aria-invalid={error ? true : invalid}
        className={`min-h-11 w-full min-w-0 rounded-xl border bg-white px-3 py-2 font-sans text-base text-gray-900 shadow-sm placeholder:text-neutral-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${error ? "border-primary" : "border-neutral-gray/30"} ${className}`}
      />
      {helperText && <p id={`${inputId}-help`} className="text-sm text-neutral-gray">{helperText}</p>}
      {error && <p id={`${inputId}-error`} className="text-sm font-medium text-primary">{error}</p>}
    </div>
  );
}
