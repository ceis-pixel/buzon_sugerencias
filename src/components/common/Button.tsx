"use client";

import { Loader2 } from "lucide-react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  Ref,
} from "react";

interface SharedButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "tertiary";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
}

interface NativeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, SharedButtonProps {
  as?: "button";
  ref?: Ref<HTMLButtonElement>;
}

interface AnchorButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement>, SharedButtonProps {
  as: "a";
  href: string;
  ref?: Ref<HTMLAnchorElement>;
}

export type ButtonProps = NativeButtonProps | AnchorButtonProps;

const variantClasses = {
  primary: "bg-primary text-white shadow-sm [&:not([aria-disabled=true])]:hover:opacity-95",
  secondary: "border border-secondary bg-transparent text-primary [&:not([aria-disabled=true])]:hover:bg-secondary/10",
  ghost: "bg-transparent text-neutral-gray [&:not([aria-disabled=true])]:hover:bg-neutral-gray/10",
  tertiary: "bg-tertiary text-white shadow-sm [&:not([aria-disabled=true])]:hover:opacity-95",
} as const;

const sizeClasses = {
  sm: "min-h-11 gap-1.5 px-3 py-2 text-sm",
  md: "min-h-11 gap-2 px-4 py-2.5 text-sm",
  lg: "min-h-12 gap-2.5 px-6 py-3 text-base",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled = false,
  children,
  className = "",
  ...elementProps
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const classes = [
    "inline-flex max-w-full items-center justify-center rounded-xl font-sans font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? "w-full" : "w-auto",
    isDisabled ? "pointer-events-none cursor-not-allowed opacity-50" : "cursor-pointer",
    className,
  ].filter(Boolean).join(" ");

  const content = (
    <>
      {isLoading ? (
        <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
      ) : leftIcon ? (
        <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:size-4">{leftIcon}</span>
      ) : null}
      <span className="min-w-0 break-words">{children}</span>
      {rightIcon && (
        <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:size-4">{rightIcon}</span>
      )}
    </>
  );

  if (elementProps.as === "a") {
    const { as: Element, href, onClick, tabIndex, ...anchorProps } = elementProps;

    return (
      <Element
        {...anchorProps}
        role="link"
        href={isDisabled ? undefined : href}
        tabIndex={isDisabled ? -1 : tabIndex}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        className={classes}
        onClick={(event) => {
          if (isDisabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onClick?.(event);
        }}
      >
        {content}
      </Element>
    );
  }

  const { as: Element = "button", type = "button", ...buttonProps } = elementProps;

  return (
    <Element
      {...buttonProps}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
      className={classes}
    >
      {content}
    </Element>
  );
}
