import type { HTMLAttributes, ReactNode } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "tertiary" | "neutral" | "success" | "warning" | "outline";
  size?: "sm" | "md";
  withDot?: boolean;
  pulse?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantClasses = {
  primary: "border-primary bg-primary text-white",
  secondary: "border-secondary/30 bg-secondary/10 text-secondary",
  tertiary: "border-tertiary/20 bg-tertiary/10 text-tertiary",
  neutral: "border-neutral-gray/20 bg-neutral-gray/10 text-neutral-gray",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  outline: "border-secondary bg-transparent text-primary",
} as const;

const sizeClasses = {
  sm: "gap-1.5 px-2.5 py-1 text-xs",
  md: "gap-2 px-3 py-1.5 text-sm",
} as const;

export function Badge({
  variant = "neutral",
  size = "sm",
  withDot = false,
  pulse = false,
  icon,
  className = "",
  children,
  ...attributes
}: BadgeProps) {
  return (
    <span
      {...attributes}
      className={[
        "inline-flex max-w-full items-center rounded-full border font-sans font-semibold shadow-sm",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].filter(Boolean).join(" ")}
    >
      {withDot && (
        <span
          aria-hidden="true"
          className={`size-1.5 shrink-0 rounded-full bg-current${pulse ? " animate-pulse motion-reduce:animate-none" : ""}`}
        />
      )}
      {icon && (
        <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:size-3.5">
          {icon}
        </span>
      )}
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}
