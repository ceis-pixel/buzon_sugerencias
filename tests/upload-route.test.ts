import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUploadSession: vi.fn() }));

vi.mock("@/lib/auth/uploadSession", () => ({ getUploadSession: mocks.getUploadSession }));

import { DELETE, POST } from "@/app/api/upload/route";
import { GET as serveUpload } from "@/app/uploads/[...path]/route";

const WEBP_HEADER = [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const STORAGE_PATH = /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/;

function webpBytes(size = 2048): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  bytes.set(WEBP_HEADER);
  return bytes;
}

function uploadRequest(file: Blob, fields: Record<string, string> = {}): Request {
  const body = new FormData();
  body.append("file", file, "foto-de-mi-bandeja.webp");
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
  return new Request("http://localhost/api/upload", { method: "POST", body });
}

function serve(storagePath: string, headers?: HeadersInit): Promise<Response> {
  return serveUpload(new Request(`http://localhost/uploads/${storagePath}`, { headers }), {
    params: Promise.resolve({ path: storagePath.split("/") }),
  });
}

let uploadDir: string;

beforeEach(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), "buzon-uploads-"));
  vi.stubEnv("UPLOAD_DIR", uploadDir);
  mocks.getUploadSession.mockResolvedValue({ ok: true, email: "alumno@unsch.edu.pe", isAdmin: false });
});

afterEach(async () => {
  await rm(uploadDir, { recursive: true, force: true });
});

describe("POST /api/upload", () => {
  it("stores the image under YYYY/MM/uuid.webp and returns its public path", async () => {
    const bytes = webpBytes();
    const response = await POST(uploadRequest(new Blob([bytes], { type: "image/webp" })));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.storagePath).toMatch(STORAGE_PATH);
    expect(body.path).toBe(`/uploads/${body.storagePath}`);
    expect(body.size).toBe(bytes.byteLength);

    const stored = await readFile(path.join(uploadDir, ...body.storagePath.split("/")));
    expect(new Uint8Array(stored)).toEqual(bytes);
  });

  it("prefixes the path with an allowed meal shift folder", async () => {
    const response = await POST(
      uploadRequest(new Blob([webpBytes()], { type: "image/webp" }), { folder: "lunch" }),
    );
    expect((await response.json()).storagePath).toMatch(/^lunch\/\d{4}\/\d{2}\//);
  });

  it("rejects an arbitrary destination folder", async () => {
    const response = await POST(
      uploadRequest(new Blob([webpBytes()], { type: "image/webp" }), { folder: "../etc" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects requests without an institutional session", async () => {
    mocks.getUploadSession.mockResolvedValue({ ok: false, reason: "unauthenticated" });
    const response = await POST(uploadRequest(new Blob([webpBytes()], { type: "image/webp" })));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("rejects disallowed MIME types", async () => {
    const response = await POST(uploadRequest(new Blob([webpBytes()], { type: "image/png" })));
    expect(response.status).toBe(415);
  });

  it("rejects content whose magic bytes do not match the declared type", async () => {
    const response = await POST(
      uploadRequest(new Blob(["<script>alert(1)</script>"], { type: "image/webp" })),
    );
    expect(response.status).toBe(415);
    expect((await response.json()).error.code).toBe("INVALID_FORMAT");
  });

  it("rejects images larger than 500 KB", async () => {
    const response = await POST(
      uploadRequest(new Blob([webpBytes(500 * 1024 + 1)], { type: "image/webp" })),
    );
    expect(response.status).toBe(413);
  });
});

describe("GET /uploads/[...path]", () => {
  it("serves a stored image with immutable cache and hardening headers", async () => {
    const bytes = webpBytes();
    const upload = await POST(uploadRequest(new Blob([bytes], { type: "image/webp" })));
    const { storagePath } = await upload.json();

    const response = await serve(storagePath);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Disposition")).toBe("inline");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);

    const revalidated = await serve(storagePath, { "If-None-Match": response.headers.get("ETag")! });
    expect(revalidated.status).toBe(304);
  });

  it.each([
    "../../etc/passwd",
    "2026/10/../../../etc/passwd",
    "2026/10/not-a-uuid.webp",
    "2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.svg",
    "2026/10/3f2b8c1e-7a4d-4e9b-9c1a-5d6e7f8a9b0c.webp\0.jpg",
  ])("answers 404 without touching the disk for %s", async (storagePath) => {
    const response = await serve(storagePath);
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("DELETE /api/upload", () => {
  async function storeOne(): Promise<string> {
    const upload = await POST(uploadRequest(new Blob([webpBytes()], { type: "image/webp" })));
    return (await upload.json()).storagePath;
  }

  function deleteRequest(storagePath: string): Request {
    return new Request(`http://localhost/api/upload?path=${encodeURIComponent(storagePath)}`, {
      method: "DELETE",
    });
  }

  it("is restricted to active moderators", async () => {
    const storagePath = await storeOne();
    const response = await DELETE(deleteRequest(storagePath));
    expect(response.status).toBe(403);
    expect((await serve(storagePath)).status).toBe(200);
  });

  it("removes the file for a moderator", async () => {
    const storagePath = await storeOne();
    mocks.getUploadSession.mockResolvedValue({ ok: true, email: "mod@unsch.edu.pe", isAdmin: true });

    expect((await DELETE(deleteRequest(storagePath))).status).toBe(204);
    expect((await serve(storagePath)).status).toBe(404);
    expect((await DELETE(deleteRequest(storagePath))).status).toBe(404);
  });

  it("rejects malformed paths", async () => {
    mocks.getUploadSession.mockResolvedValue({ ok: true, email: "mod@unsch.edu.pe", isAdmin: true });
    expect((await DELETE(deleteRequest("../../etc/passwd"))).status).toBe(400);
  });
});
