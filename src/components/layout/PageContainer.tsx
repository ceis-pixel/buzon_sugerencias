import type { ReactNode } from "react";

interface PageContainerProps {
  readonly children: ReactNode;
  readonly title?: string;
  readonly subtitle?: string;
  readonly badge?: ReactNode;
}

export function PageContainer({
  children,
  title,
  subtitle,
  badge,
}: PageContainerProps) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      {(title || subtitle || badge) && (
        <header className="mb-6 space-y-3">
          {badge && (
            <span className="inline-flex max-w-full items-center rounded-xl border border-secondary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              {badge}
            </span>
          )}
          {title && (
            <h1 className="text-balance text-2xl font-bold text-primary md:text-3xl">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-pretty text-base leading-7 text-secondary">
              {subtitle}
            </p>
          )}
        </header>
      )}
      {children}
    </div>
  );
}
