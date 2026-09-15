import { CheckCircle2, Clock, Eye, type LucideIcon } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/common/Badge";
import type { Database } from "@/types/database.types";

export type TicketStatus = Database["public"]["Enums"]["suggestion_status"];

export interface StatusBadgeProps extends Omit<BadgeProps, "children" | "icon" | "variant"> {
  status: TicketStatus;
}

const statusConfig = {
  pending: { label: "Pendiente", icon: Clock, variant: "warning" },
  in_review: { label: "En revisión", icon: Eye, variant: "tertiary" },
  resolved: { label: "Atendido", icon: CheckCircle2, variant: "success" },
} satisfies Record<TicketStatus, { label: string; icon: LucideIcon; variant: BadgeProps["variant"] }>;

export function StatusBadge({ status, ...props }: StatusBadgeProps) {
  const { label, icon: Icon, variant } = statusConfig[status];

  return (
    <Badge {...props} variant={variant} icon={<Icon />}>
      {label}
    </Badge>
  );
}
