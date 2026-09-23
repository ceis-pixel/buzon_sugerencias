import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ImageAttachmentField } from "@/components/media/ImageAttachmentField";
import { ImageLightboxModal } from "@/components/media/ImageLightboxModal";
import { ImagePreviewCard, type ImagePreviewCardProps } from "@/components/media/ImagePreviewCard";

describe("ImagePreviewCard component", () => {
  const defaultProps: ImagePreviewCardProps = {
    previewUrl: "blob:http://localhost/test-preview-123",
    fileName: "foto_menu_almuerzo.webp",
    originalSize: 5 * 1024 * 1024, // 5 MB
    compressedSize: 120 * 1024,     // 120 KB (~97.6% savings)
    onRemove: vi.fn(),
  };

  it("renders with optimization badges, format tag, and calculated savings percentage", () => {
    const html = renderToStaticMarkup(createElement(ImagePreviewCard, defaultProps));

    // File name
    expect(html).toContain("foto_menu_almuerzo.webp");

    // Format badge
    expect(html).toContain("WebP");

    // Compressed size and calculated savings percentage (~98%)
    expect(html).toContain("120 KB");
    expect(html).toContain("(-98%)");

    // Reassurance message
    expect(html).toContain("Evidencia optimizada");
  });

  it("provides an accessible discard button with mobile touch sizing (44x44 px)", () => {
    const html = renderToStaticMarkup(createElement(ImagePreviewCard, defaultProps));

    expect(html).toContain('aria-label="Eliminar fotografía adjunta"');
    expect(html).toContain("min-h-11");
    expect(html).toContain("min-w-11");
    expect(html).toContain("size-11");
  });

  it("provides an accessible trigger to open the lightbox view", () => {
    const html = renderToStaticMarkup(createElement(ImagePreviewCard, defaultProps));

    expect(html).toContain('aria-label="Ampliar fotografía para verificar legibilidad"');
    expect(html).toContain("Ver completa");
  });
});

describe("ImageLightboxModal component", () => {
  it("renders null when isOpen is false", () => {
    const html = renderToStaticMarkup(
      createElement(ImageLightboxModal, {
        isOpen: false,
        onClose: vi.fn(),
        imageUrl: "blob:http://localhost/test-preview",
      })
    );

    expect(html).toBe("");
  });

  it("renders an accessible dialog with close button and image when isOpen is true", () => {
    const html = renderToStaticMarkup(
      createElement(ImageLightboxModal, {
        isOpen: true,
        onClose: vi.fn(),
        imageUrl: "blob:http://localhost/test-preview",
        fileName: "almuerzo_bandeja.webp",
      })
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Vista ampliada de la fotografía adjunta"');
    expect(html).toContain('aria-label="Cerrar vista ampliada"');
    expect(html).toContain("almuerzo_bandeja.webp");
    expect(html).toContain("min-h-11");
    expect(html).toContain("min-w-11");
  });
});

describe("ImageAttachmentField component", () => {
  it("renders ImageUploadTrigger in its initial idle state", () => {
    const html = renderToStaticMarkup(
      createElement(ImageAttachmentField, {
        onChange: vi.fn(),
      })
    );

    expect(html).toContain('role="region"');
    expect(html).toContain("Adjuntar evidencia visual (opcional)");
    expect(html).toContain("Tomar foto");
    expect(html).toContain("Galería");
  });
});
