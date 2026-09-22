import { Bell } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AlertBanner, type AlertBannerProps } from "@/components/common/AlertBanner";

function renderBanner(props: Partial<AlertBannerProps> = {}) {
  return renderToStaticMarkup(createElement(AlertBanner, { description: "Mensaje de prueba", ...props }));
}

describe("AlertBanner semantics", () => {
  it.each([
    ["system", "status", "text-tertiary"],
    ["info", "status", "text-gray-700"],
    ["success", "status", "text-emerald-800"],
    ["warning", "alert", "text-amber-800"],
    ["error", "alert", "text-primary"],
  ] as const)("maps %s to the appropriate severity and palette", (variant, role, color) => {
    const html = renderBanner({ variant });
    expect(html).toContain(`role="${role}"`);
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain(color);
    if (variant !== "system") expect(html).not.toContain("tertiary");
  });

  it("defaults to a persistent system notice with no empty accessible label", () => {
    const html = renderBanner();
    expect(html).toContain("text-tertiary");
    expect(html).not.toContain("aria-labelledby");
    expect(html).not.toContain("<button");
  });

  it("associates unique titles and renders rich content and decorative custom icons", () => {
    const props = { title: "Aviso", description: createElement("strong", null, "Revisa tu código"), icon: Bell };
    const html = renderToStaticMarkup(createElement("div", null, createElement(AlertBanner, props), createElement(AlertBanner, props)));
    const ids = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(html).toContain(`id="${id}"`);
    expect(html).toContain("<strong>Revisa tu código</strong>");
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).toContain("lucide-bell");
  });

  it("enables an accessible non-submitting close button from onClose alone", () => {
    const html = renderBanner({ onClose: () => {} });
    expect(html).toContain('aria-label="Cerrar notificación"');
    expect(html).toContain('type="button"');
  });

  it("honors explicit dismissal settings with or without a callback", () => {
    expect(renderBanner({ onClose: () => {}, isDismissible: false })).not.toContain("Cerrar notificación");
    expect(renderBanner({ isDismissible: true })).toContain("Cerrar notificación");
  });

  it("renders navigation as a link even when it also has a callback", () => {
    const html = renderBanner({ action: { label: "Consultar", href: "#ticket", onClick: () => {} } });
    expect(html).toMatch(/<a [^>]*href="#ticket"/);
    expect(html).not.toContain("<button");
  });

  it("keeps callback actions non-submitting and disables incomplete actions", () => {
    const html = renderBanner({ action: { label: "Reintentar", onClick: () => {} } });
    expect(html).toMatch(/<button type="button"/);
    expect(html).not.toContain('disabled=""');
    expect(renderBanner({ action: { label: "Reintentar" } })).toContain('disabled=""');
  });
});
