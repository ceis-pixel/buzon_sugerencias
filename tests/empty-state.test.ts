import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Search } from "lucide-react";
import { describe, expect, it } from "vitest";

import { EmptyState, type EmptyStateProps } from "@/components/common/EmptyState";
import { emptyStatePresets } from "@/components/common/emptyStatePresets";

function renderEmptyState(props: Partial<EmptyStateProps> = {}) {
  return renderToStaticMarkup(createElement(EmptyState, { ...emptyStatePresets.ticketNotFound, ...props }));
}

describe("EmptyState accessibility and actions", () => {
  it.each(Object.values(emptyStatePresets))("renders a labelled region for $title without announcing an alert", (preset) => {
    const html = renderEmptyState(preset);
    const titleId = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(titleId).toBeTruthy();
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${titleId}"`);
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).toContain(preset.title);
    expect(html).toContain(preset.description);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<a ");
  });

  it("renders a callback action as a non-submitting native Button", () => {
    const html = renderEmptyState({ action: { label: "Buscar otro ticket", onClick: () => {} } });
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-disabled="false"');
    expect(html).toContain("Buscar otro ticket");
    expect(html).toContain("bg-primary");
  });

  it("preserves link semantics when href and a callback are provided", () => {
    const html = renderEmptyState({ action: { label: "Buscar otro ticket", href: "#search", onClick: () => {}, icon: Search } });
    expect(html).toMatch(/<a [^>]*href="#search"/);
    expect(html).toContain('role="link"');
    expect(html).not.toContain("<button");
    expect(html).toMatch(/<div aria-hidden="true"[^>]*><svg/);
    expect(html).toMatch(/<span aria-hidden="true"[^>]*><svg/);
  });

  it("allows an independent secondary action in plain mode", () => {
    const html = renderEmptyState({ ...emptyStatePresets.inboxClear, variant: "plain", secondaryAction: { label: "Refrescar datos", onClick: () => {} } });
    expect(html).toContain("Bandeja al día");
    expect(html).toContain("Refrescar datos");
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).not.toContain("shadow-sm");
    expect(html).not.toContain("rounded-2xl");
  });

  it("supports a secondary navigation link alongside a primary action", () => {
    const html = renderEmptyState({ action: { label: "Buscar", onClick: () => {} }, secondaryAction: { label: "Volver al inicio", href: "/" } });
    expect(html).toContain("<button");
    expect(html).toMatch(/<a [^>]*href="\/"/);
    expect(html).toContain("Volver al inicio");
  });

  it("disables an action with neither destination nor callback", () => {
    const html = renderEmptyState({ action: { label: "Buscar" } });
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-disabled="true"');
  });

  it("keeps labels unique across instances and preserves caller classes", () => {
    const html = renderToStaticMarkup(createElement("div", null,
      createElement(EmptyState, { ...emptyStatePresets.ticketNotFound, className: "mt-4" }),
      createElement(EmptyState, emptyStatePresets.inboxClear),
    ));
    const ids = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(html).toContain("mt-4");
  });
});
