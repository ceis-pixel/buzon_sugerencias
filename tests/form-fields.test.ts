import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Input } from "@/components/common/Input";
import { Textarea } from "@/components/common/Textarea";

describe("Form field accessibility", () => {
  it("links the input label, help, error and caller description without losing native attributes", () => {
    const html = renderToStaticMarkup(createElement(Input, {
      id: "ticket", label: "Código", helperText: "Copia tu código", error: "Revisa el formato", required: true,
      name: "ticketCode", "aria-describedby": "external-help", "aria-invalid": false, defaultValue: "UNSCH-A39B",
    }));
    expect(html).toContain('for="ticket"');
    expect(html).toContain('id="ticket"');
    expect(html).toContain('name="ticketCode"');
    expect(html).toContain('value="UNSCH-A39B"');
    expect(html).toContain('aria-describedby="external-help ticket-help ticket-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('required=""');
    expect(html).toContain('id="ticket-error"');
  });

  it("generates unique labelled IDs and allows externally supplied invalid state", () => {
    const html = renderToStaticMarkup(createElement("div", null,
      createElement(Input, { label: "Código", "aria-invalid": true }),
      createElement(Input, { label: "Consulta", disabled: true }),
    ));
    const ids = [...html.matchAll(/<label for="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('aria-invalid="true"');
    expect(html).not.toContain("aria-describedby");
    expect(html).toContain('disabled=""');
  });

  it("describes a controlled textarea with its current count, limit and error", () => {
    const html = renderToStaticMarkup(createElement(Textarea, {
      id: "message", label: "Tu idea", value: "Hola", readOnly: true, maxLength: 300,
      helperText: "Comparte una mejora", error: "Escribe un poco más", "aria-describedby": "context",
    }));
    expect(html).toContain('for="message"');
    expect(html).toContain('aria-describedby="context message-help message-error message-count"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('maxLength="300"');
    expect(html).toContain("4 de 300 caracteres");
    expect(html).toContain('id="message-count"');
    expect(html).not.toContain('role="alert"');
  });

  it("supports an optional count without announcing every keystroke", () => {
    const html = renderToStaticMarkup(createElement(Textarea, { label: "Tu idea", value: "", readOnly: true, showCount: false }));
    expect(html).not.toContain("caracteres");
    expect(html).not.toContain("aria-describedby");
    expect(html).not.toContain("aria-live");
    expect(html).not.toContain("aria-invalid");
  });
});
