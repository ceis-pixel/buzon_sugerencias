"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface AlertBannerProps {
  variant?: "system" | "info" | "warning" | "error" | "success";
  title?: string;
  description: ReactNode;
  icon?: LucideIcon;
  action?: { label: string; onClick?: () => void; href?: string };
  onClose?: () => void;
  isDismissible?: boolean;
  className?: string;
}

const variants = {
  system: { classes: "border-tertiary/20 bg-tertiary/5 text-tertiary", icon: Info, role: "status" },
  info: { classes: "border-neutral-gray/20 bg-slate-50 text-gray-700", icon: Info, role: "status" },
  warning: { classes: "border-amber-200 bg-amber-50 text-amber-800", icon: AlertTriangle, role: "alert" },
  error: { classes: "border-primary/20 bg-primary/5 text-primary", icon: AlertCircle, role: "alert" },
  success: { classes: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2, role: "status" },
} as const;

export function AlertBanner({
  variant = "system", title, description, icon, action, onClose,
  isDismissible = Boolean(onClose), className = "",
}: AlertBannerProps) {
  const id = useId();
  const [isClosing, setIsClosing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = variants[variant];
  const Icon = icon ?? config.icon;

  useEffect(() => () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
  }, []);

  function handleClose() {
    if (closeTimer.current !== null) return;
    setIsClosing(true);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200;
    closeTimer.current = setTimeout(() => {
      setIsDismissed(true);
      onClose?.();
    }, delay);
  }

  if (isDismissed) return null;

  const actionClasses = "inline-flex min-h-11 max-w-full items-center rounded-lg px-2 py-1 text-left text-sm font-semibold underline underline-offset-4 transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";

  return (
    <div
      role={config.role}
      aria-atomic="true"
      aria-labelledby={title ? `${id}-title` : undefined}
      className={`flex min-w-0 gap-3 rounded-2xl border p-4 font-sans shadow-sm transition-all duration-200 motion-reduce:animate-none motion-reduce:transition-none ${config.classes} ${isClosing ? "pointer-events-none opacity-0" : "animate-fade-in opacity-100"} ${className}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1 break-words">
        {title && <p id={`${id}-title`} className="font-semibold leading-6">{title}</p>}
        <div className={`text-sm leading-6 ${title ? "mt-1" : ""}`}>{description}</div>
        {action && (
          <div className="mt-2">
            {action.href ? (
              <a href={action.href} onClick={action.onClick} className={actionClasses}>{action.label}</a>
            ) : (
              <button type="button" disabled={!action.onClick || isClosing} onClick={action.onClick} className={actionClasses}>{action.label}</button>
            )}
          </div>
        )}
      </div>
      {isDismissible && (
        <button
          type="button"
          aria-label="Cerrar notificación"
          disabled={isClosing}
          onClick={handleClose}
          className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center self-start rounded-lg p-1 transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 disabled:cursor-not-allowed motion-reduce:transition-none"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
