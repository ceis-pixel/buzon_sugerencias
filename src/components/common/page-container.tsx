import type { ReactNode } from "react";

interface PageContainerProps {
  readonly children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">{children}</div>;
}
