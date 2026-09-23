import type { SupabaseClient } from "@supabase/supabase-js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ImageAttachmentField } from "@/components/media/ImageAttachmentField";
import { UploadProgressCard } from "@/components/media/UploadProgressCard";
import { uploadSuggestionImage } from "@/lib/services/storageService";
import type { Database } from "@/types/database.types";

describe("uploadSuggestionImage resilience, abort, and timeout", () => {
  const sampleFile = new File([new Uint8Array(100 * 1024)], "foto.webp", {
    type: "image/webp",
  });

  it("aborts immediately if the AbortSignal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      uploadSuggestionImage(sampleFile, { signal: controller.signal })
    ).rejects.toMatchObject({
      code: "ABORTED",
      message: "La subida de la imagen fue cancelada.",
    });
  });

  it("aborts mid-flight when signal is triggered while upload is pending", async () => {
    const controller = new AbortController();

    // Mock an upload that never completes until aborted
    const mockUpload = vi.fn().mockImplementation(() => new Promise(() => {}));
    const mockClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: vi.fn(),
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const uploadPromise = uploadSuggestionImage(sampleFile, {
      signal: controller.signal,
      client: mockClient,
    });

    // Abort after a tick
    setTimeout(() => {
      controller.abort();
    }, 10);

    await expect(uploadPromise).rejects.toMatchObject({
      code: "ABORTED",
    });
  });

  it("triggers defensive timeout if network does not respond within timeoutMs", async () => {
    const mockUpload = vi.fn().mockImplementation(() => new Promise(() => {}));
    const mockClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: vi.fn(),
        }),
      },
    } as unknown as SupabaseClient<Database>;

    await expect(
      uploadSuggestionImage(sampleFile, {
        client: mockClient,
        timeoutMs: 50, // Short timeout for test
      })
    ).rejects.toMatchObject({
      code: "TIMEOUT_ERROR",
      status: 408,
      message: "La conexión tardó demasiado tiempo. Comprueba tu señal móvil e intenta nuevamente.",
    });
  });

  it("emits progress updates via onProgress callback", async () => {
    const onProgress = vi.fn();
    const mockUpload = vi.fn().mockResolvedValue({ data: { path: "path" }, error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "http://public.url" } });
    const mockClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
        }),
      },
    } as unknown as SupabaseClient<Database>;

    const result = await uploadSuggestionImage(sampleFile, {
      client: mockClient,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(100);
    expect(result.publicUrl).toBe("http://public.url");
  });
});

describe("UploadProgressCard component", () => {
  it("renders progress bar with semantic accessibility attributes and percentage", () => {
    const html = renderToStaticMarkup(
      createElement(UploadProgressCard, {
        progress: 68,
        status: "uploading",
        fileName: "evidencia.webp",
        onCancel: vi.fn(),
      })
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="68"');
    expect(html).toContain("68%");
    expect(html).toContain("Cargando evidencia...");
    expect(html).toContain("evidencia.webp");
    expect(html).toContain('aria-label="Cancelar subida"');
  });

  it("renders retrying status text when reattempting upload", () => {
    const html = renderToStaticMarkup(
      createElement(UploadProgressCard, {
        progress: 15,
        status: "retrying",
        onCancel: vi.fn(),
      })
    );

    expect(html).toContain("Reintentando transferencia...");
    expect(html).toContain("15%");
  });

  it("renders network error alert and prominent retry button when status is error", () => {
    const onRetry = vi.fn();
    const onDiscard = vi.fn();

    const html = renderToStaticMarkup(
      createElement(UploadProgressCard, {
        progress: 100,
        status: "error",
        errorMessage: "La señal móvil es inestable. No pudimos completar la subida.",
        onRetry,
        onDiscard,
      })
    );

    expect(html).toContain("Interrupción en la subida");
    expect(html).toContain("La señal móvil es inestable. No pudimos completar la subida.");
    expect(html).toContain("Reintentar ahora");
    expect(html).toContain("Descartar foto");
  });
});

describe("ImageAttachmentField upload state integration", () => {
  it("renders UploadProgressCard when uploadStatus is uploading", () => {
    const html = renderToStaticMarkup(
      createElement(ImageAttachmentField, {
        uploadStatus: "uploading",
        uploadProgress: 45,
        onCancelUpload: vi.fn(),
      })
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain("45%");
    expect(html).toContain("Cargando evidencia...");
  });

  it("renders UploadProgressCard with retry button when uploadStatus is error", () => {
    const html = renderToStaticMarkup(
      createElement(ImageAttachmentField, {
        uploadStatus: "error",
        uploadError: "Conexión perdida",
        onRetryUpload: vi.fn(),
      })
    );

    expect(html).toContain("Interrupción en la subida");
    expect(html).toContain("Conexión perdida");
    expect(html).toContain("Reintentar ahora");
  });
});
