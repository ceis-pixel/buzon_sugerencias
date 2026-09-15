import { Coffee, Moon, UtensilsCrossed, type LucideIcon } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/common/Badge";
import type { Database } from "@/types/database.types";

export type MealShift = Database["public"]["Enums"]["meal_shift"];

export interface ShiftBadgeProps extends Omit<BadgeProps, "children" | "icon" | "variant"> {
  shift: MealShift;
  isSelected?: boolean;
}

const shiftConfig = {
  breakfast: { label: "Desayuno", icon: Coffee },
  lunch: { label: "Almuerzo", icon: UtensilsCrossed },
  dinner: { label: "Cena", icon: Moon },
} satisfies Record<MealShift, { label: string; icon: LucideIcon }>;

export function ShiftBadge({ shift, isSelected = false, ...props }: ShiftBadgeProps) {
  const { label, icon: Icon } = shiftConfig[shift];

  return (
    <Badge {...props} variant={isSelected ? "primary" : "neutral"} icon={<Icon />}>
      {label}
      {isSelected && <span className="sr-only"> (seleccionado)</span>}
    </Badge>
  );
}
