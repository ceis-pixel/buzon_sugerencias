import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  deleteSuggestionImage,
  generateStoragePath,
  StorageUploadError,
  uploadSuggestionImage,
} from "@/lib/services/storageService";

describe("generateStoragePath", () => {
  it("generates partitioned path matching YYYY/MM/uuid-v4.webp", () => {
    const path = generateStoragePath("webp");
    const currentYear = new Date().getUTCFullYear();
    const currentMonth = String(new Date().getUTCMonth() + 1).padStart(2, "0");

    expect(path).toMatch(
      new RegExp(`^${currentYear}/${currentMonth}/[0-9a-f-]{36}\\.webp$`)
    );
  });

  it("sanitizes leading dots and uppercase from extensions", () => {
    const path = generateStoragePath(".JPEG");
    expect(path.endsWith(".jpeg")).toBe(true);
  });

  it("supports optional parent folder prefix", () => {
    const path = generateStoragePath("webp", "lunch");
    const currentYear = new Date().getUTCFullYear();
    const currentMonth = String(new Date().getUTCMonth() + 1).padStart(2, "0");

    expect(path).toMatch(
      new RegExp(`^lunch/${currentYear}/${currentMonth}/[0-9a-f-]{36}\\.webp$`)
    );
  });
});

describe("uploadSuggestionImage defensive validations", () => {
  it("rejects empty or corrupt files with 0 bytes", async () => {
    const emptyFile = new File([], "empty.webp", { type: "image/webp" });

    await expect(uploadSuggestionImage(emptyFile)).rejects.toThrow(
      "El archivo de imagen está vacío o corrupto."
    );
    await expect(uploadSuggestionImage(emptyFile)).rejects.toBeInstanceOf(
      StorageUploadError
    );
  });

  it("rejects files exceeding 500 KB limit", async () => {
    const largeFile = new File(
      [new Uint8Array(501 * 1024)],
      "demasiado_grande.webp",
      { type: "image/webp" }
    );

    await expect(
      uploadSuggestionImage(largeFile, { maxSizeBytes: DEFAULT_MAX_UPLOAD_SIZE_BYTES })
    ).rejects.toThrow(
      "La imagen excede el límite permitido de 500 KB tras la compresión. Por favor, intenta con otra foto."
    );
  });

  it("rejects disallowed MIME types such as PDF or GIF", async () => {
    const pdfFile = new File([new Uint8Array(1000)], "documento.pdf", {
      type: "application/pdf",
    });

    await expect(uploadSuggestionImage(pdfFile)).rejects.toThrow(
      "Formato de imagen no permitido. Solo se aceptan fotografías en formato WebP o JPEG."
    );

    const gifFile = new File([new Uint8Array(1000)], "animacion.gif", {
      type: "image/gif",
    });

    await expect(uploadSuggestionImage(gifFile)).rejects.toThrow(
      "Formato de imagen no permitido. Solo se aceptan fotografías en formato WebP o JPEG."
    );
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("uploadSuggestionImage on-premise storage pipeline", () => {
  const mockFile = new File(
    [new Uint8Array(120 * 1024)],
    "evidencia_bandeja.webp",
    { type: "image/webp" }
  );

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        path: "/uploads/2026/10/uuid.webp",
        storagePath: "2026/10/uuid.webp",
        size: 120 * 1024,
      })
    );
    vi.stubGlobal("fetch", mockFetch);
  });

  it("posts the image as FormData to /api/upload and returns the local public path", async () => {
    const result = await uploadSuggestionImage(mockFile, { folder: "lunch" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/upload");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");

    const body = init.body as FormData;
    const sent = body.get("file") as File;
    expect(sent.type).toBe("image/webp");
    expect(sent.size).toBe(120 * 1024);
    // The original file name never leaves the device.
    expect(sent.name).toBe("upload.webp");
    expect(body.get("folder")).toBe("lunch");

    expect(result).toEqual({
      publicUrl: "/uploads/2026/10/uuid.webp",
      storagePath: "2026/10/uuid.webp",
      fileSize: 120 * 1024,
    });
  });

  it("translates 413 Payload Too Large server errors into student-friendly Spanish", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Payload too large", { status: 413 }));

    await expect(uploadSuggestionImage(mockFile)).rejects.toThrow(
      "La imagen supera el límite de tamaño permitido por el servidor."
    );
  });

  it("translates session / permission errors into actionable institutional guidance", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(uploadSuggestionImage(mockFile)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message:
        "No cuentas con permisos para subir fotografías. Debes iniciar sesión con tu cuenta institucional.",
    });
  });

  it("prefers the message returned by the server when present", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(415, {
        error: {
          code: "INVALID_FORMAT",
          message: "El contenido del archivo no corresponde a una imagen WebP o JPEG válida.",
        },
      })
    );

    await expect(uploadSuggestionImage(mockFile)).rejects.toMatchObject({
      code: "INVALID_FORMAT",
      status: 415,
      message: "El contenido del archivo no corresponde a una imagen WebP o JPEG válida.",
    });
  });

  it("translates connection / network errors clearly", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(uploadSuggestionImage(mockFile)).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: "No se pudo subir la imagen por problemas de conexión. Por favor, reintenta el envío.",
    });
  });

  it("rejects a success response without the stored path", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(201, {}));

    await expect(uploadSuggestionImage(mockFile)).rejects.toMatchObject({ code: "UPLOAD_FAILED" });
  });
});

describe("deleteSuggestionImage", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", mockFetch);
  });

  it("sends a DELETE request for the storage path", async () => {
    await deleteSuggestionImage("2026/09/foto-descartada.webp");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/upload?path=2026%2F09%2Ffoto-descartada.webp",
      { method: "DELETE", credentials: "same-origin" }
    );
  });

  it("handles empty path safely without network requests", async () => {
    await deleteSuggestionImage("");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("treats an already missing image as deleted", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(deleteSuggestionImage("2026/09/ausente.webp")).resolves.toBeUndefined();
  });

  it("throws a StorageUploadError if deletion fails", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(deleteSuggestionImage("2026/09/error.webp")).rejects.toThrow(
      "No se pudo eliminar la imagen del almacenamiento."
    );
  });
});
