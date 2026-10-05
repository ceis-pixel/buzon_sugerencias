import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUploadSession: vi.fn() }));

vi.mock("@/lib/auth/uploadSession", () => ({ getUploadSession: mocks.getUploadSession }));

import { POST as uploadPost } from "@/app/api/upload/route";
import { GET as serveUpload } from "@/app/uploads/[...path]/route";
import {
  isDatabaseOrInternalError,
  sanitizeDatabaseError,
} from "@/lib/errors/dbErrorHandler";
import { sanitizeHtml, sanitizeUserText } from "@/lib/security/sanitization";
import {
  deleteUpload,
  InvalidStoragePathError,
  readUpload,
  resolveStoragePath,
} from "@/lib/storage/localDiskStorage";
import {
  isLocalUploadPath,
  isValidStoragePath,
  storagePathFromPublicPath,
} from "@/lib/storage/uploadPolicy";
import {
  mapSuggestionError,
  submitSuggestionSchema,
} from "@/lib/validations/suggestionSchema";

const WEBP_MAGIC_HEADER = [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]; // RIFF....WEBP
const JPEG_MAGIC_HEADER = [0xff, 0xd8, 0xff];

function validWebpBytes(size = 1024): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  bytes.set(WEBP_MAGIC_HEADER);
  return bytes;
}

function validJpegBytes(size = 1024): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  bytes.set(JPEG_MAGIC_HEADER);
  return bytes;
}

function uploadRequest(file: Blob, fields: Record<string, string> = {}): Request {
  const body = new FormData();
  body.append("file", file, "evidencia.webp");
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
  return new Request("http://localhost/api/upload", { method: "POST", body });
}

function serve(storagePath: string, headers?: HeadersInit): Promise<Response> {
  return serveUpload(new Request(`http://localhost/uploads/${storagePath}`, { headers }), {
    params: Promise.resolve({ path: storagePath.split("/") }),
  });
}

describe("Security Hardening Hito 3: Perímetro y Blindaje de Archivos", () => {
  let uploadDir: string;

  beforeEach(async () => {
    uploadDir = await mkdtemp(path.join(tmpdir(), "security-uploads-"));
    vi.stubEnv("UPLOAD_DIR", uploadDir);
    mocks.getUploadSession.mockResolvedValue({
      ok: true,
      email: "seguridad@unsch.edu.pe",
      isAdmin: false,
    });
  });

  afterEach(async () => {
    await rm(uploadDir, { recursive: true, force: true });
  });

  describe("1. Validación Binaria de Archivos (Magic Numbers) y Rechazo de Payloads Maliciosos", () => {
    it("a) rechaza un archivo con extensión .webp pero contenido binario no válido (ejecutable ELF/PE o script) respondiendo 415", async () => {
      // Intento 1: Script malicioso disfrazado de imagen WebP
      const maliciousScript = new Blob(["<script>alert('pwned')</script>"], {
        type: "image/webp",
      });
      const resScript = await uploadPost(uploadRequest(maliciousScript));
      expect(resScript.status).toBe(415);
      const scriptBody = await resScript.json();
      expect(scriptBody.error.code).toBe("INVALID_FORMAT");
      expect(scriptBody.error.message).toContain("no corresponde a una imagen WebP o JPEG válida");

      // Intento 2: Binario ejecutable ELF disfrazado
      const fakeElf = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]);
      const resElf = await uploadPost(
        uploadRequest(new Blob([fakeElf], { type: "image/webp" })),
      );
      expect(resElf.status).toBe(415);
      expect((await resElf.json()).error.code).toBe("INVALID_FORMAT");

      // Intento 3: Cabecera truncada incompleta (menos de 12 bytes)
      const truncated = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
      const resTruncated = await uploadPost(
        uploadRequest(new Blob([truncated], { type: "image/webp" })),
      );
      expect(resTruncated.status).toBe(415);
    });

    it("acepta subida de imágenes con magic bytes legítimos en formato WebP y JPEG", async () => {
      const resWebp = await uploadPost(
        uploadRequest(new Blob([validWebpBytes()], { type: "image/webp" })),
      );
      expect(resWebp.status).toBe(201);

      const resJpeg = await uploadPost(
        uploadRequest(new Blob([validJpegBytes()], { type: "image/jpeg" })),
      );
      expect(resJpeg.status).toBe(201);
    });

    it("rechaza payload vacío con código 400", async () => {
      const emptyBlob = new Blob([], { type: "image/webp" });
      const res = await uploadPost(uploadRequest(emptyBlob));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_FILE");
    });
  });

  describe("2. Blindaje Zod: Eliminación y Rechazo de URLs Externas en photo_url", () => {
    it("b) rechaza un intento de envío de sugerencia con photo_url apuntando a URL externa maliciosa", () => {
      const maliciousUrls = [
        "https://malicious-site.com/image.jpg",
        "http://malicious-site.com/payload.webp",
        "https://storage.supabase.co/bucket/img.webp",
        "http://localhost:3000/uploads/2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp",
        "javascript:alert(1)",
        "data:image/webp;base64,UklGR==",
      ];

      for (const url of maliciousUrls) {
        expect(isLocalUploadPath(url)).toBe(false);
        expect(storagePathFromPublicPath(url)).toBeNull();

        const result = submitSuggestionSchema.safeParse({
          shift: "lunch",
          category: "menu",
          message: "Observación con intento de inyección de URL externa.",
          photo_url: url,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const issue = result.error.issues.find((i) => i.path.includes("photo_url"));
          expect(issue?.message).toContain("La ruta de la fotografía adjunta no es válida");
        }
      }
    });

    it("acepta rutas relativas canónicas internas generadas por el sistema", () => {
      const validCanonicalPaths = [
        "/uploads/2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp",
        "/uploads/lunch/2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp",
        "/uploads/breakfast/2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.jpg",
        "",
        null,
      ];

      for (const photoPath of validCanonicalPaths) {
        if (photoPath) {
          expect(isLocalUploadPath(photoPath)).toBe(true);
          const extracted = storagePathFromPublicPath(photoPath);
          expect(extracted).not.toBeNull();
          expect(isValidStoragePath(extracted!)).toBe(true);
        }

        const result = submitSuggestionSchema.safeParse({
          shift: "lunch",
          category: "service",
          message: "Observación con ruta fotográfica canónica segura.",
          photo_url: photoPath,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("3. Prevención de Path Traversal y Caracteres Nulos en Almacenamiento Local", () => {
    it("c) bloquea y responde 404 ante intentos de lectura con Path Traversal en /uploads", async () => {
      const traversalAttempts = [
        "../../etc/passwd",
        "../../../etc/shadow",
        "2026/10/../../../etc/passwd",
        "../uploads/2026/10/file.webp",
        "..\\..\\windows\\win.ini",
        "2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp\0.jpg",
        "2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp%00.jpg",
      ];

      for (const traversalPath of traversalAttempts) {
        const response = await serve(traversalPath);
        expect(response.status).toBe(404);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
      }
    });

    it("lanza InvalidStoragePathError en resolveStoragePath ante secuencias de escape y caracteres nulos", () => {
      expect(() => resolveStoragePath("../../etc/passwd", uploadDir)).toThrow(
        InvalidStoragePathError,
      );
      expect(() =>
        resolveStoragePath(
          "2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp\0",
          uploadDir,
        ),
      ).toThrow(InvalidStoragePathError);
      expect(() => resolveStoragePath("2026/10/../etc/passwd", uploadDir)).toThrow(
        InvalidStoragePathError,
      );
    });

    it("retorna null de forma segura en readUpload ante path traversal", async () => {
      await expect(readUpload("../../etc/passwd", uploadDir)).rejects.toThrow(
        InvalidStoragePathError,
      );
    });

    it("retorna error seguro en deleteUpload ante path traversal", async () => {
      await expect(deleteUpload("../../etc/passwd", uploadDir)).rejects.toThrow(
        InvalidStoragePathError,
      );
    });
  });

  describe("4. Servicio Seguro de Archivos Estáticos con Cabeceras Defensivas", () => {
    it("incluye todas las cabeceras defensivas requeridas para neutralizar ejecución de código", async () => {
      const bytes = validWebpBytes();
      const uploadRes = await uploadPost(
        uploadRequest(new Blob([bytes], { type: "image/webp" }), { folder: "lunch" }),
      );
      expect(uploadRes.status).toBe(201);
      const { storagePath } = await uploadRes.json();

      const res = await serve(storagePath);
      expect(res.status).toBe(200);

      // Verificación de los 5 requisitos de cabeceras de seguridad
      expect(res.headers.get("Content-Type")).toBe("image/webp");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Content-Security-Policy")).toBe(
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
      expect(res.headers.get("Content-Disposition")).toBe("inline");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    });
  });

  describe("5. Sanitización Defensiva contra XSS (message y response_text)", () => {
    it("escapa etiquetas y vectores de inyección XSS peligrosos", () => {
      const xssVectors = [
        {
          input: "<script>alert('XSS')</script>",
          expected: "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;",
        },
        {
          input: "<img src=x onerror=alert(1)>",
          expected: "&lt;img src=x onerror=alert(1)&gt;",
        },
        {
          input: "Normal text with \"quotes\" & 'apostrophes'",
          expected: "Normal text with &quot;quotes&quot; &amp; &#x27;apostrophes&#x27;",
        },
        {
          input: "Null byte injection\0 payload",
          expected: "Null byte injection payload",
        },
      ];

      for (const { input, expected } of xssVectors) {
        expect(sanitizeHtml(input)).toBe(expected);
        expect(sanitizeUserText(input)).toBe(expected);
      }
    });

    it("preserva caracteres normales y acentos del español", () => {
      const peruvianFeedback =
        "El almuerzo de hoy estuvo excelente: porción balanceada, sopa caliente y buena atención.";
      expect(sanitizeUserText(peruvianFeedback)).toBe(peruvianFeedback);
    });
  });

  describe("6. Manejador Centralizado de Excepciones de Base de Datos (Anti-Leak)", () => {
    it("identifica errores de base de datos e internos de forma precisa", () => {
      expect(
        isDatabaseOrInternalError(
          new Error('relation "public.suggestions" does not exist at /app/services.ts'),
        ),
      ).toBe(true);
      expect(
        isDatabaseOrInternalError({
          code: "42P01",
          message: "table does not exist",
        }),
      ).toBe(true);
      expect(isDatabaseOrInternalError(new Error("Normal user validation"))).toBe(false);
    });

    it("garantiza que ningún error 500 filtre tablas, columnas, rutas o fragmentos SQL", () => {
      const sensitiveErrors = [
        new Error(
          'relation "public.suggestions" does not exist at /app/src/lib/services/suggestionService.ts:75 (SELECT * FROM public.suggestions)',
        ),
        new Error(
          'column "rate_hash" of relation "submission_rate_limits" does not exist in query UPDATE public.submission_rate_limits',
        ),
        new Error(
          'could not open relation file "d:\\buzon_sugerencias\\node_modules\\pg": filesystem I/O error',
        ),
        new Error(
          "syntax error at or near \"SELECT\" in SQL statement: SELECT ticket_code, message FROM suggestions WHERE id = 'abc'",
        ),
      ];

      for (const err of sensitiveErrors) {
        // Test directo del escudo centralizado
        const safeResp = sanitizeDatabaseError(err);
        expect(safeResp.statusCode).toBe(500);
        expect(safeResp.safeMessage).not.toContain("suggestions");
        expect(safeResp.safeMessage).not.toContain("rate_hash");
        expect(safeResp.safeMessage).not.toContain("SELECT");
        expect(safeResp.safeMessage).not.toContain("submission_rate_limits");
        expect(safeResp.safeMessage).not.toContain("/app");
        expect(safeResp.safeMessage).not.toContain("buzon_sugerencias");

        // Test de mapSuggestionError
        const clientMessage = mapSuggestionError(err);
        expect(clientMessage).toBe(
          "Ocurrió un problema al enviar tu sugerencia. Por favor, intenta de nuevo en unos momentos.",
        );
        expect(clientMessage).not.toContain("suggestions");
        expect(clientMessage).not.toContain("SELECT");
      }
    });
  });
});
