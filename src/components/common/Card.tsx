import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive" | "bordered" | "ghost";
  padding?: "none" | "sm" | "md" | "lg";
}

const variantClasses = {
  default: "border-gray-100 bg-white",
  interactive: "cursor-pointer border-gray-100 bg-white transition-all duration-200 hover:border-secondary/40 focus-within:border-secondary/40 motion-reduce:transition-none",
  bordered: "border-neutral-gray/20 bg-white",
  ghost: "border-transparent bg-transparent",
} as const;

const paddingClasses = { none: "p-0", sm: "p-4", md: "p-6", lg: "p-8" } as const;

export function Card({ variant = "default", padding = "md", className = "", ...props }: CardProps) {
  return <div {...props} className={`min-w-0 rounded-2xl border shadow-sm ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`} />;
}

export function CardHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`flex items-start justify-between gap-4 pb-4 ${className}`} />;
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h2" | "h3" | "h4";
}

export function CardTitle({ as: Element = "h2", className = "", ...props }: CardTitleProps) {
  return <Element {...props} className={`font-sans text-lg font-bold text-gray-900 ${className}`} />;
}

export function CardDescription({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={`text-sm leading-6 text-neutral-gray ${className}`} />;
}

export function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`min-w-0 break-words ${className}`} />;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  withBorder?: boolean;
}

export function CardFooter({ withBorder = false, className = "", ...props }: CardFooterProps) {
  return <div {...props} className={`mt-4 flex flex-wrap items-center gap-3 pt-4 ${withBorder ? "border-t border-gray-50" : ""} ${className}`} />;
}
