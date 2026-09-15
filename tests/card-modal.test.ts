import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/Card";
import { Modal, type ModalProps } from "@/components/common/Modal";

function renderModal(props: Partial<ModalProps> = {}) {
  const modalProps: ModalProps = { isOpen: false, onClose: () => {}, children: "Contenido de prueba", ...props };
  return renderToStaticMarkup(createElement(Modal, modalProps, modalProps.children));
}

describe("Card composition", () => {
  it("preserves headings, descriptions and native actions in a composed card", () => {
    const html = renderToStaticMarkup(createElement(Card, { id: "card", "aria-labelledby": "card-title" },
      createElement(CardHeader, null,
        createElement(CardTitle, { id: "card-title", as: "h3" }, "Sugerencias"),
        createElement(CardDescription, null, "Comparte una idea")),
      createElement(CardContent, null, "Contenido"),
      createElement(CardFooter, { withBorder: true }, createElement("button", { type: "button" }, "Abrir")),
    ));
    expect(html).toContain('aria-labelledby="card-title"');
    expect(html).toContain('<h3 id="card-title"');
    expect(html).toContain("Comparte una idea");
    expect(html).toContain('type="button"');
    expect(html).toContain("border-t border-gray-50");
    expect(html).not.toContain("withBorder=");
  });

  it("does not introduce a fake button role or tab stop for visual variants", () => {
    const html = renderToStaticMarkup(createElement(Card, { variant: "interactive", padding: "none" }, "Turno"));
    expect(html).not.toContain("role=");
    expect(html).not.toContain("tabindex=");
    expect(html).not.toContain("variant=");
    expect(html).not.toContain("padding=");
  });
});

describe("Modal server rendering and accessible names", () => {
  it("starts hidden in SSR and connects its accessible title and description", () => {
    const html = renderModal({ isOpen: true, title: "Nueva sugerencia", description: "Solo una prueba" });
    const titleId = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(titleId).toBeTruthy();
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${titleId}"`);
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).not.toMatch(/<dialog[^>]*\sopen(?:=|\s|>)/);
    expect(html).toContain('aria-modal="true"');
  });

  it("provides a Spanish accessible name when the visual title is omitted", () => {
    const html = renderModal();
    expect(html).toContain("Ventana de información");
    expect(html).not.toContain("aria-describedby=");
    expect(html).toContain('aria-label="Cerrar ventana"');
  });

  it("can omit the close icon while preserving an explicit footer action", () => {
    const html = renderModal({ showCloseButton: false, footer: createElement("button", { type: "button" }, "Cancelar") });
    expect(html).not.toContain("Cerrar ventana");
    expect(html).toContain("Cancelar");
  });

  it("generates distinct labels for multiple instances", () => {
    const props: ModalProps = { isOpen: false, onClose: () => {}, children: "Prueba" };
    const html = renderToStaticMarkup(createElement("div", null, createElement(Modal, props), createElement(Modal, props)));
    const ids = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
