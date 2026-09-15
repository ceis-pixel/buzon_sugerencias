import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Badge, type BadgeProps } from "@/components/common/Badge";
import { ShiftBadge, type ShiftBadgeProps } from "@/components/common/ShiftBadge";
import { StatusBadge, type StatusBadgeProps } from "@/components/common/StatusBadge";

function renderBadge(props: BadgeProps) {
  return renderToStaticMarkup(createElement(Badge, props, props.children));
}

describe("Badge accessibility and domain semantics", () => {
  it("forwards native attributes without creating an interactive or live region by default", () => {
    const html = renderBadge({
      children: "Aviso", id: "notice", title: "Información del comedor", className: "mt-2",
    });
    expect(html).toContain('id="notice"');
    expect(html).toContain('title="Información del comedor"');
    expect(html).toContain("mt-2");
    expect(html).not.toContain("role=");
    expect(html).not.toContain("tabindex=");
  });

  it("keeps decorative icons and dots out of the accessible name", () => {
    const html = renderBadge({
      children: "Aviso", withDot: true, icon: createElement("svg"),
    });
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
    expect(html).toContain("Aviso");
    expect(html).not.toContain("animate-pulse");
    expect(html).not.toContain("withDot=");
  });

  it("only animates an explicitly requested dot and includes reduced-motion support", () => {
    const html = renderBadge({ children: "Actividad", withDot: true, pulse: true });
    expect(html).toContain("animate-pulse motion-reduce:animate-none");
    const noDot = renderBadge({ children: "Aviso", pulse: true });
    expect(noDot).not.toContain("animate-pulse");
  });

  it.each([
    ["pending", "Pendiente", "bg-amber-50", "text-amber-700", "border-amber-200"],
    ["in_review", "En revisión", "bg-tertiary/10", "text-tertiary", "border-tertiary/20"],
    ["resolved", "Atendido", "bg-emerald-50", "text-emerald-700", "border-emerald-200"],
  ] as const)("maps %s to its Spanish label and prescribed status palette", (status, label, ...colors) => {
    const html = renderToStaticMarkup(createElement(StatusBadge, { status }));
    expect(html).toContain(label);
    for (const color of colors) expect(html).toContain(color);
    expect(html).toContain("<svg");
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("status=");
  });

  it.each([
    ["breakfast", "Desayuno"], ["lunch", "Almuerzo"], ["dinner", "Cena"],
  ] as const)("maps %s and conveys selection without depending on color alone", (shift, label) => {
    const normal = renderToStaticMarkup(createElement(ShiftBadge, { shift }));
    const selected = renderToStaticMarkup(createElement(ShiftBadge, { shift, isSelected: true }));
    expect(normal).toContain(label);
    expect(normal).toContain("<svg");
    expect(normal).not.toContain("seleccionado");
    expect(selected).toContain(label);
    expect(selected).toContain(" (seleccionado)");
    expect(selected).toContain("bg-primary");
    expect(selected).not.toContain("isSelected=");
    expect(selected).not.toContain("aria-pressed=");
  });

  // These contracts are checked by tsc rather than runtime assertions.
  // @ts-expect-error Unknown statuses cannot be presented as valid ticket states.
  const invalidStatus: StatusBadgeProps = { status: "closed" };
  // @ts-expect-error Domain colors are resolved by the status, not the caller.
  const invalidVariant: StatusBadgeProps = { status: "pending", variant: "success" };
  // @ts-expect-error Only supported meal shifts can be displayed.
  const invalidShift: ShiftBadgeProps = { shift: "snack" };
  void [invalidStatus, invalidVariant, invalidShift];
});
