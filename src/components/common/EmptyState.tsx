import type { LucideIcon } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/common/Button";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface EmptyStatePrimaryAction extends EmptyStateAction {
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStatePrimaryAction;
  secondaryAction?: EmptyStateAction;
  variant?: "card" | "plain";
  className?: string;
}

function ActionButton({ action, variant }: {
  action: EmptyStatePrimaryAction;
  variant: "primary" | "ghost";
}) {
  const ActionIcon = action.icon;
  const leftIcon = ActionIcon ? <ActionIcon /> : undefined;
  const className = "w-full sm:w-auto";

  if (action.href) {
    return (
      <Button as="a" href={action.href} onClick={action.onClick} variant={variant} leftIcon={leftIcon} className={className}>
        {action.label}
      </Button>
    );
  }

  return (
    <Button onClick={action.onClick} disabled={!action.onClick} variant={variant} leftIcon={leftIcon} className={className}>
      {action.label}
    </Button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "card",
  className = "",
}: EmptyStateProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <section
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={[
        "flex min-w-0 flex-col items-center justify-center text-center",
        variant === "card" ? "rounded-2xl border border-gray-100 bg-white p-8 shadow-sm" : "px-4 py-10",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div aria-hidden="true" className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary">
        <Icon className="size-7" />
      </div>
      <h2 id={titleId} className="max-w-full break-words font-sans text-lg font-bold text-gray-900">{title}</h2>
      <p id={descriptionId} className="mt-2 max-w-sm break-words text-sm leading-6 text-neutral-gray">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex w-full max-w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          {action && <ActionButton action={action} variant="primary" />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="ghost" />}
        </div>
      )}
    </section>
  );
}
