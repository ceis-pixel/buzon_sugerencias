import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  deleteSuggestionImage,
  generateStoragePath,
  StorageUploadError,
  uploadSuggestionImage,
} from "@/lib/services/storageService";
import type { Database } from "@/types/database.types";

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

describe("uploadSuggestionImage Supabase storage pipeline", () => {
  const mockFile = new File(
    [new Uint8Array(120 * 1024)],
    "evidencia_bandeja.webp",
    { type: "image/webp" }
  );

  let mockUpload: ReturnType<typeof vi.fn>;
  let mockGetPublicUrl: ReturnType<typeof vi.fn>;
  let mockRemove: ReturnType<typeof vi.fn>;
  let mockClient: SupabaseClient<Database>;

  beforeEach(() => {
    mockUpload = vi.fn().mockResolvedValue({ data: { path: "some/path.webp" }, error: null });
    mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://xyz.supabase.co/storage/v1/object/public/suggestion-media/2026/09/uuid.webp" },
    });
    mockRemove = vi.fn().mockResolvedValue({ data: [], error: null });

    mockClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
          remove: mockRemove,
        }),
      },
    } as unknown as SupabaseClient<Database>;
  });

  it("successfully uploads to suggestion-media with 1-year cacheControl and returns publicUrl", async () => {
    const result = await uploadSuggestionImage(mockFile, { client: mockClient });

    expect(mockClient.storage.from).toHaveBeenCalledWith("suggestion-media");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/),
      mockFile,
      {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      }
    );
    expect(result.publicUrl).toBe(
      "https://xyz.supabase.co/storage/v1/object/public/suggestion-media/2026/09/uuid.webp"
    );
    expect(result.fileSize).toBe(120 * 1024);
  });

  it("translates 413 Payload Too Large server errors into student-friendly Spanish", async () => {
    mockUpload.mockResolvedValueOnce({
      data: null,
      error: { message: "Payload too large", statusCode: 413 },
    });

    await expect(
      uploadSuggestionImage(mockFile, { client: mockClient })
    ).rejects.toThrow(
      "La imagen supera el límite de tamaño permitido por el servidor."
    );
  });

  it("translates RLS / permission errors into actionable institutional guidance", async () => {
    mockUpload.mockResolvedValueOnce({
      data: null,
      error: { message: "new row violates row-level security policy", statusCode: 403 },
    });

    await expect(
      uploadSuggestionImage(mockFile, { client: mockClient })
    ).rejects.toThrow(
      "No cuentas con permisos para subir fotografías. Debes iniciar sesión con tu cuenta institucional."
    );
  });

  it("translates connection / network errors clearly", async () => {
    mockUpload.mockResolvedValueOnce({
      data: null,
      error: { message: "Failed to fetch from network", statusCode: 0 },
    });

    await expect(
      uploadSuggestionImage(mockFile, { client: mockClient })
    ).rejects.toThrow(
      "No se pudo subir la imagen por problemas de conexión. Por favor, reintenta el envío."
    );
  });
});

describe("deleteSuggestionImage", () => {
  let mockRemove: ReturnType<typeof vi.fn>;
  let mockClient: SupabaseClient<Database>;

  beforeEach(() => {
    mockRemove = vi.fn().mockResolvedValue({ data: [], error: null });
    mockClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          remove: mockRemove,
        }),
      },
    } as unknown as SupabaseClient<Database>;
  });

  it("invokes storage remove on the suggestion-media bucket", async () => {
    const path = "2026/09/foto-descartada.webp";
    await deleteSuggestionImage(path, mockClient);

    expect(mockClient.storage.from).toHaveBeenCalledWith("suggestion-media");
    expect(mockRemove).toHaveBeenCalledWith([path]);
  });

  it("handles empty path safely without network requests", async () => {
    await deleteSuggestionImage("", mockClient);
    expect(mockClient.storage.from).not.toHaveBeenCalled();
  });

  it("throws a StorageUploadError if deletion fails", async () => {
    mockRemove.mockResolvedValueOnce({
      data: null,
      error: { message: "Database connection failed" },
    });

    await expect(
      deleteSuggestionImage("2026/09/error.webp", mockClient)
    ).rejects.toThrow("No se pudo eliminar la imagen del almacenamiento.");
  });
});
