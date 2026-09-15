import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button, type ButtonProps } from "@/components/common/Button";

function renderButton(props: ButtonProps = {}) {
  const { children = "Enviar", ...attributes } = props;
  return renderToStaticMarkup(createElement(Button, attributes, children));
}

describe("Button semantics", () => {
  it("defaults to a non-submitting native button and forwards form attributes", () => {
    const html = renderButton({ name: "action", value: "save", form: "suggestion-form" });
    expect(html).toContain('type="button"');
    expect(html).toContain('name="action"');
    expect(html).toContain('value="save"');
    expect(html).toContain('form="suggestion-form"');
    expect(html).toContain('aria-disabled="false"');
    expect(renderButton({ type: "submit" })).toContain('type="submit"');
  });

  it("keeps the label while loading and enforces native and ARIA disabled states", () => {
    const html = renderButton({ isLoading: true, "aria-busy": false, "aria-disabled": false });
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("Enviar");
    expect(html).not.toContain("isLoading");
  });

  it("distinguishes disabled from busy", () => {
    const html = renderButton({ disabled: true });
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="false"');
  });

  it("renders navigation as an anchor with native link attributes", () => {
    const html = renderButton({ as: "a", href: "/tickets", target: "_blank", rel: "noreferrer" });
    expect(html).toMatch(/^<a /);
    expect(html).toContain('href="/tickets"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).not.toContain('type="button"');
    expect(html).not.toContain('as="a"');
  });

  it.each([{ disabled: true }, { isLoading: true }])(
    "removes disabled navigation from link activation and keyboard tab order: %o",
    (state) => {
      const html = renderButton({ as: "a", href: "/tickets", tabIndex: 0, ...state });
      expect(html).not.toContain("href=");
      expect(html).toContain('role="link"');
      expect(html).toContain('tabindex="-1"');
      expect(html).toContain('aria-disabled="true"');
    },
  );

  it("preserves accessible names for icon-only controls", () => {
    const html = renderButton({ children: null, "aria-label": "Buscar ticket", leftIcon: createElement("svg") });
    expect(html).toContain('aria-label="Buscar ticket"');
    expect(html).toContain('aria-hidden="true"');
  });

  it("accepts references matching the rendered element", () => {
    const native: ButtonProps = { ref: createRef<HTMLButtonElement>() };
    const link: ButtonProps = { as: "a", href: "/", ref: createRef<HTMLAnchorElement>() };
    expect(renderButton(native)).toMatch(/^<button /);
    expect(renderButton(link)).toMatch(/^<a /);

    // @ts-expect-error Anchors require a destination.
    const missingHref: ButtonProps = { as: "a" };
    // @ts-expect-error Native buttons do not accept link destinations.
    const invalidHref: ButtonProps = { as: "button", href: "/" };
    // @ts-expect-error Anchor refs must point to anchors.
    const invalidRef: ButtonProps = { as: "a", href: "/", ref: createRef<HTMLButtonElement>() };
    void [missingHref, invalidHref, invalidRef];
  });
});
