import path from "node:path";

import { readUpload, InvalidStoragePathError } from "@/lib/storage/localDiskStorage";
import { isValidStoragePath, mimeTypeForStoragePath } from "@/lib/storage/uploadPolicy";

export const dynamic = "force-dynamic";

/** File names are random UUIDs and never rewritten, so the content is immutable. */
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

function securityHeaders(): Headers {
  return new Headers({
    "X-Content-Type-Options": "nosniff",
    // Images must never execute scripts nor be framed as documents (Hito 3 perimeter requirements).
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "Content-Disposition": "inline",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
}

function notFound(): Response {
  const headers = securityHeaders();
  headers.set("Cache-Control", "no-store");
  return new Response("Not found", { status: 404, headers });
}

async function serve(
  request: Request,
  params: Promise<{ path: string[] }>,
  includeBody: boolean,
): Promise<Response> {
  const { path: segments } = await params;
  if (!segments || segments.length === 0) {
    return notFound();
  }

  const storagePath = segments.join("/");

  if (
    !storagePath ||
    storagePath.includes("\0") ||
    storagePath.includes("..") ||
    !isValidStoragePath(storagePath)
  ) {
    return notFound();
  }

  const baseName = path.basename(storagePath);
  if (!baseName || baseName !== segments[segments.length - 1] || baseName.includes("..")) {
    return notFound();
  }

  const contentType = mimeTypeForStoragePath(storagePath);
  if (!contentType) {
    return notFound();
  }

  let file: Awaited<ReturnType<typeof readUpload>>;
  try {
    file = await readUpload(storagePath);
  } catch (error) {
    if (error instanceof InvalidStoragePathError) return notFound();
    throw error;
  }

  if (!file) {
    return notFound();
  }

  const etag = `"${file.size.toString(16)}-${file.modifiedAt.getTime().toString(16)}"`;
  const headers = securityHeaders();
  headers.set("Cache-Control", IMMUTABLE_CACHE);
  headers.set("ETag", etag);
  headers.set("Last-Modified", file.modifiedAt.toUTCString());

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  headers.set("Content-Type", contentType);
  headers.set("Content-Length", String(file.size));

  return new Response(includeBody ? new Uint8Array(file.bytes) : null, {
    status: 200,
    headers,
  });
}

/** GET /uploads/[folder/]YYYY/MM/<uuid>.<ext> — serves persisted media from the uploads volume. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return serve(request, params, true);
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return serve(request, params, false);
}
