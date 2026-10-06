import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPool: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getPool: mocks.getPool,
  query: mocks.query,
  sanitizeDbMessage: (message: string) =>
    message.replace(/(postgres(?:ql)?:\/\/)[^@\s/]*@/gi, "$1***@"),
}));

import { GET, SYSTEM_VERSION } from "@/app/api/health/route";
import {
  formatLogEntry,
  logger,
  maskSensitiveData,
  sanitizeLogData,
  type LogEntry,
} from "@/lib/logger";
import {
  DEFAULT_ORPHAN_GRACE_PERIOD_MS,
  deleteFiles,
  identifyOrphanUploads,
} from "@/lib/maintenance/cleanup";

let tempDir: string;
let uploadDir: string;
let backupDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "buzon-dr-test-"));
  uploadDir = path.join(tempDir, "uploads");
  backupDir = path.join(tempDir, "backups");
  await mkdir(uploadDir, { recursive: true });
  await mkdir(backupDir, { recursive: true });

  vi.stubEnv("UPLOAD_DIR", uploadDir);
  vi.stubEnv("NEXTAUTH_SECRET", "super-secret-nextauth-token-32-chars-long");
  vi.stubEnv("GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-secret-xyz-1234567890");
  vi.stubEnv("RATE_LIMIT_HMAC_SECRET", "super-secret-hmac-rate-limit-token-32-chars");

  mocks.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
  mocks.getPool.mockReturnValue({ query: mocks.query });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(tempDir, { recursive: true, force: true });
});

describe("Hito 4: Continuidad Operativa, Disaster Recovery, Mantenimiento y Observabilidad", () => {
  // ===========================================================================
  // 1. Simulación y Validación de Respaldos (Disaster Recovery RPO < 24h, RTO < 30m)
  // ===========================================================================
  describe("1. Simulación de Respaldos y Verificación de Integridad (Disaster Recovery)", () => {
    it("genera un volcado de PostgreSQL comprimido en gzip y valida su integridad", async () => {
      const dumpSql = `
        -- PostgreSQL Database Dump: buzon_comedor
        CREATE TABLE suggestions (id uuid PRIMARY KEY, ticket_code text NOT NULL, message text);
        INSERT INTO suggestions (id, ticket_code, message) VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'UNSCH-T001', 'Comida balanceada');
      `;

      const compressed = zlib.gzipSync(Buffer.from(dumpSql, "utf-8"));
      const backupPath = path.join(backupDir, "backup_20261006_030000.sql.gz");
      await writeFile(backupPath, compressed);

      // Verificación de integridad: descompresión sin errores
      const fileBuffer = await import("node:fs/promises").then((fs) => fs.readFile(backupPath));
      expect(fileBuffer.length).toBeGreaterThan(0);

      const decompressed = zlib.gunzipSync(fileBuffer).toString("utf-8");
      expect(decompressed).toContain("CREATE TABLE suggestions");
      expect(decompressed).toContain("UNSCH-T001");
    });

    it("detecta y rechaza archivos de respaldo corruptos o truncados", async () => {
      const corruptPath = path.join(backupDir, "corrupted_backup.sql.gz");
      // Archivo con cabecera gzip rota
      await writeFile(corruptPath, Buffer.from("NOT_A_VALID_GZIP_FILE_CONTENT"));

      const fileBuffer = await import("node:fs/promises").then((fs) => fs.readFile(corruptPath));
      expect(() => zlib.gunzipSync(fileBuffer)).toThrow();
    });

    it("aplica la política de retención eliminando respaldos mayores a 7 días y reteniendo los recientes", async () => {
      const now = Date.now();
      const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);

      const oldBackup = path.join(backupDir, "backup_old.sql.gz");
      const recentBackup = path.join(backupDir, "backup_recent.sql.gz");

      await writeFile(oldBackup, zlib.gzipSync(Buffer.from("OLD DUMP")));
      await writeFile(recentBackup, zlib.gzipSync(Buffer.from("RECENT DUMP")));

      await utimes(oldBackup, eightDaysAgo, eightDaysAgo);
      await utimes(recentBackup, twoDaysAgo, twoDaysAgo);

      // Simular lógica de retención (7 días)
      const retentionCutoff = now - 7 * 24 * 60 * 60 * 1000;
      const files = await readdir(backupDir);

      for (const file of files) {
        const fullPath = path.join(backupDir, file);
        const stat = await import("node:fs/promises").then((fs) => fs.stat(fullPath));
        if (stat.mtimeMs < retentionCutoff) {
          await rm(fullPath);
        }
      }

      const remaining = await readdir(backupDir);
      expect(remaining).toContain("backup_recent.sql.gz");
      expect(remaining).not.toContain("backup_old.sql.gz");
    });
  });

  // ===========================================================================
  // 2. Mantenimiento y Purga de Imágenes Huérfanas
  // ===========================================================================
  describe("2. Detección y Purga de Archivos Huérfanos en Almacenamiento", () => {
    it("identifica imágenes huérfanas sin referencia en base de datos tras el período de gracia", () => {
      const now = Date.now();
      const filesOnDisk = [
        // 1. Archivo referenciado activamente en DB (no huérfano)
        {
          storagePath: "2026/10/referenced-1.webp",
          modifiedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
          sizeBytes: 12000,
        },
        // 2. Archivo huérfano antiguo (> 24h) sin referencia -> DEBE ser purgado
        {
          storagePath: "2026/10/orphan-old.webp",
          modifiedAt: new Date(now - 48 * 60 * 60 * 1000),
          sizeBytes: 15000,
        },
        // 3. Archivo sin referencia pero reciente (< 24h) -> período de gracia, NO purgar
        {
          storagePath: "2026/10/orphan-fresh.webp",
          modifiedAt: new Date(now - 2 * 60 * 60 * 1000),
          sizeBytes: 18000,
        },
        // 4. Archivo en subcarpeta con turno referenciado
        {
          storagePath: "lunch/2026/09/active-lunch.webp",
          modifiedAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
          sizeBytes: 20000,
        },
      ];

      const referencedDbUrls = [
        "/uploads/2026/10/referenced-1.webp",
        "uploads/lunch/2026/09/active-lunch.webp",
      ];

      const orphans = identifyOrphanUploads(
        filesOnDisk,
        referencedDbUrls,
        DEFAULT_ORPHAN_GRACE_PERIOD_MS,
        now,
      );

      expect(orphans).toEqual(["2026/10/orphan-old.webp"]);
      expect(orphans).not.toContain("2026/10/referenced-1.webp");
      expect(orphans).not.toContain("2026/10/orphan-fresh.webp");
      expect(orphans).not.toContain("lunch/2026/09/active-lunch.webp");
    });

    it("elimina físicamente del disco los archivos identificados para purga", async () => {
      const orphanRel = "2026/10/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.webp";
      const keepRel = "2026/10/b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22.webp";

      const file1 = path.join(uploadDir, ...orphanRel.split("/"));
      const file2 = path.join(uploadDir, ...keepRel.split("/"));

      await mkdir(path.dirname(file1), { recursive: true });
      await writeFile(file1, "dummy data");
      await writeFile(file2, "dummy data");

      const deleted = await deleteFiles([orphanRel]);
      expect(deleted).toContain(orphanRel);

      const remainingFiles = await readdir(path.dirname(file1));
      expect(remainingFiles).toContain("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22.webp");
      expect(remainingFiles).not.toContain("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.webp");
    });
  });

  // ===========================================================================
  // 3. Logging Estructurado y Filtro Defensivo de Anonimato
  // ===========================================================================
  describe("3. Logging Estructurado y Censura Defensiva de Datos Sensibles", () => {
    it("emite registros en JSON válido con los campos obligatorios", () => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "info",
        context: "SuggestionController",
        message: "Operación de prueba ejecutada exitosamente",
        details: { ticketCode: "UNSCH-99A1" },
      };

      const jsonStr = formatLogEntry(entry);
      expect(() => JSON.parse(jsonStr)).not.toThrow();

      const parsed = JSON.parse(jsonStr);
      expect(parsed).toMatchObject({
        level: "info",
        context: "SuggestionController",
        message: "Operación de prueba ejecutada exitosamente",
        details: { ticketCode: "UNSCH-99A1" },
      });
      expect(parsed.timestamp).toBeDefined();
    });

    it("enmascara correos institucionales de estudiantes y correos externos para garantizar anonimato", () => {
      const raw =
        "El estudiante 2024.usuario@unsch.edu.pe registró una sugerencia. Notificar a soporte@gmail.com";
      const masked = maskSensitiveData(raw);

      expect(masked).not.toContain("2024.usuario@unsch.edu.pe");
      expect(masked).not.toContain("soporte@gmail.com");
      expect(masked).toContain("***@unsch.edu.pe");
      expect(masked).toContain("***@***");
    });

    it("censura credenciales de base de datos, tokens JWT y hashes HMAC", () => {
      const connectionUri = "connect ECONNREFUSED postgresql://postgres:SuperSecretP@ss123@db:5432/buzon";
      const jwtToken =
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature";
      const rateHash = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

      const maskedUri = maskSensitiveData(connectionUri);
      expect(maskedUri).not.toContain("SuperSecretP@ss123");
      expect(maskedUri).toContain("postgresql://***@db:5432/buzon");

      const maskedJwt = maskSensitiveData(jwtToken);
      expect(maskedJwt).not.toContain("eyJhbGci");
      expect(maskedJwt).toContain("[REDACTED_JWT]");

      const maskedHash = maskSensitiveData(rateHash);
      expect(maskedHash).not.toContain("a1b2c3d4e5f6");
      expect(maskedHash).toBe("[REDACTED_HASH]");
    });

    it("redacta claves sensibles en objetos arbitrarios de detalles", () => {
      const sensitiveDetails = {
        studentId: "12345",
        password: "my-plain-password",
        secret: "super-secret-key",
        rate_hash: "abcd",
        nested: {
          token: "secret-token",
          safeField: "safe value",
        },
      };

      const sanitized = sanitizeLogData(sensitiveDetails) as Record<string, unknown>;
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.secret).toBe("[REDACTED]");
      expect(sanitized.rate_hash).toBe("[REDACTED]");
      expect((sanitized.nested as Record<string, unknown>).token).toBe("[REDACTED]");
      expect((sanitized.nested as Record<string, unknown>).safeField).toBe("safe value");
    });

    it("captura errores y excepciones sin filtrar credenciales en el stack ni en el mensaje", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const dbError = new Error(
        "Fallo de conexión en postgresql://app_user:db_password_xyz@db:5432/buzon_comedor",
      );
      (dbError as unknown as { code: string }).code = "ECONNREFUSED";

      logger.error("DBConnection", "Error al conectar al pool", dbError);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const lastCallArg = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(lastCallArg).toBeDefined();

      const parsed = JSON.parse(lastCallArg);
      expect(parsed.level).toBe("error");
      expect(parsed.context).toBe("DBConnection");
      expect(parsed.error.message).not.toContain("db_password_xyz");
      expect(parsed.error.message).toContain("postgresql://***@db:5432/buzon_comedor");
      expect(parsed.error.code).toBe("ECONNREFUSED");
    });
  });

  // ===========================================================================
  // 4. Diagnóstico Profundo y Monitoreo (/api/health)
  // ===========================================================================
  describe("4. Endpoint /api/health — Diagnóstico Profundo y Observabilidad OTI", () => {
    it("retorna HTTP 200 con versión, uptime y métricas cuando el sistema está operativo", async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("ok");
      expect(data.version).toBe(SYSTEM_VERSION);
      expect(typeof data.uptime).toBe("number");
      expect(data.uptime).toBeGreaterThanOrEqual(0);

      expect(data.checks).toEqual({
        database: "ok",
        storage: "ok",
        auth: "ok",
      });

      expect(data.metrics).toBeDefined();
      expect(typeof data.metrics.dbResponseTimeMs).toBe("number");
      expect(data.metrics.dbResponseTimeMs).toBeGreaterThanOrEqual(0);
      expect(data.metrics.storage.writable).toBe(true);
      expect(typeof data.metrics.uptimeSeconds).toBe("number");
    });

    it("retorna HTTP 503 con diagnóstico de degradación si la base de datos no responde", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.query.mockRejectedValue(
        new Error("connect ECONNREFUSED postgresql://user:secret123@db:5432"),
      );

      const response = await GET();
      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.status).toBe("unavailable");
      expect(data.checks.database).toBe("error");
      expect(data.metrics.dbResponseTimeMs).toBeNull();

      // Verifica que no se filtren credenciales en la respuesta JSON
      const jsonText = JSON.stringify(data);
      expect(jsonText).not.toContain("secret123");
    });

    it("retorna HTTP 503 con diagnóstico si el volumen de almacenamiento no es accesible", async () => {
      vi.stubEnv("UPLOAD_DIR", path.join(uploadDir, "non_existent_subdir"));

      const response = await GET();
      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.status).toBe("unavailable");
      expect(data.checks.storage).toBe("error");
      expect(data.metrics.storage.writable).toBe(false);
    });
  });
});
