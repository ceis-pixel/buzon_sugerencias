import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ImageUploadTrigger, type ImageUploadTriggerProps } from "@/components/media/ImageUploadTrigger";

function renderTrigger(props: Partial<ImageUploadTriggerProps> = {}) {
  const defaultProps: ImageUploadTriggerProps = {
    onFileSelected: vi.fn(),
    ...props,
  };
  return renderToStaticMarkup(createElement(ImageUploadTrigger, defaultProps));
}

describe("ImageUploadTrigger component", () => {
  it("renders with proper semantic structure and accessible region label", () => {
    const html = renderTrigger();

    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Zona para adjuntar evidencia fotográfica"');
    expect(html).toContain("Adjuntar evidencia visual (opcional)");
    expect(html).toContain("Máximo 1 foto. La imagen se optimizará automáticamente antes de enviarse.");
    expect(html).toContain("o arrastra y suelta tu archivo aquí");
  });

  it("includes hidden native inputs with mobile camera and gallery attributes", () => {
    const html = renderTrigger();

    // Camera input: captures rear environment camera on smartphones
    expect(html).toContain('accept="image/*"');
    expect(html).toContain('capture="environment"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('aria-hidden="true"');

    // Gallery input: accepts web-safe image formats
    expect(html).toContain('accept="image/png,image/jpeg,image/webp"');
    expect(html).not.toMatch(/accept="image\/png,image\/jpeg,image\/webp"[^>]*capture=/);
  });

  it("renders visible action buttons with expected labels and Lucide icons", () => {
    const html = renderTrigger();

    // Direct action buttons
    expect(html).toContain("Tomar foto");
    expect(html).toContain("Galería");
    expect(html).toContain("<button");
  });

  it("enforces disabled states on inputs and action buttons when disabled is true", () => {
    const html = renderTrigger({ disabled: true });

    // Inputs disabled
    const disabledInputs = html.match(/<input[^>]*disabled=""/g);
    expect(disabledInputs?.length).toBe(2);

    // Buttons disabled
    const disabledButtons = html.match(/<button[^>]*disabled=""/g);
    expect(disabledButtons?.length).toBe(2);

    // Container visual disabled state
    expect(html).toContain("opacity-60 cursor-not-allowed");
  });

  it("merges custom className with default container classes", () => {
    const html = renderTrigger({ className: "custom-upload-class" });

    expect(html).toContain("custom-upload-class");
    expect(html).toContain("rounded-2xl");
    expect(html).toContain("border-dashed");
  });
});
