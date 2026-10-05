/**
 * Isomorphic upload policy shared by the browser client (storageService) and
 * the on-premise Route Handlers (/api/upload and /uploads/[...path]).
 *
 * It must stay free of Node.js-only or browser-only APIs.
 */

export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 500 * 1024; // 500 KB limit for compressed uploads
export const DEFAULT_UPLOAD_TIMEOUT_MS = 15000; // 15 seconds defensive timeout for unstable 2G/3G networks

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/webp",
  "image/jpeg",
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

/** Optional first-level folders accepted by the server (meal shifts). */
export const ALLOWED_UPLOAD_FOLDERS = ["breakfast", "lunch", "dinner"] as const;

/** Public URL prefix under which locally stored media is served. */
export const PUBLIC_UPLOADS_PREFIX = "/uploads";

/** Internal endpoint that receives the compressed image via FormData. */
export const UPLOAD_ENDPOINT = "/api/upload";

/** FormData field names expected by the upload endpoint. */
export const UPLOAD_FORM_FIELD = "file";
export const UPLOAD_FOLDER_FIELD = "folder";

const EXTENSION_BY_MIME: Record<AllowedUploadMimeType, "webp" | "jpg"> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

const MIME_BY_EXTENSION: Record<string, AllowedUploadMimeType> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/**
 * Strict relative storage path: `[folder/]YYYY/MM/uuid-v4.(webp|jpg|jpeg)`.
 * Rejects traversal sequences, absolute paths and any unexpected character.
 */
const STORAGE_PATH_PATTERN =
  /^(?:(?:breakfast|lunch|dinner)\/)?\d{4}\/(?:0[1-9]|1[0-2])\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:webp|jpg|jpeg)$/;

export function isAllowedUploadMimeType(value: string): value is AllowedUploadMimeType {
  return (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(value);
}

export function isAllowedUploadFolder(
  value: string,
): value is (typeof ALLOWED_UPLOAD_FOLDERS)[number] {
  return (ALLOWED_UPLOAD_FOLDERS as readonly string[]).includes(value);
}

export function extensionForMimeType(mimeType: AllowedUploadMimeType): "webp" | "jpg" {
  return EXTENSION_BY_MIME[mimeType];
}

export function mimeTypeForStoragePath(storagePath: string): AllowedUploadMimeType | null {
  const extension = storagePath.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? null;
}

function randomUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates an anonymous, date-partitioned storage path using UUID v4.
 * Format: `YYYY/MM/uuid-v4.webp` (or `${folder}/YYYY/MM/uuid-v4.webp`)
 *
 * Discards local file names completely to guarantee student anonymity and avoid collisions.
 */
export function generateStoragePath(
  extension: string = "webp",
  folder?: string,
  now: Date = new Date(),
): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const uuid = randomUuidV4();
  const cleanExt = extension.replace(/^\.+/, "").toLowerCase();

  if (folder) {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
    return `${cleanFolder}/${year}/${month}/${uuid}.${cleanExt}`;
  }

  return `${year}/${month}/${uuid}.${cleanExt}`;
}

/** Returns true only for paths produced by {@link generateStoragePath} with allowed values. */
export function isValidStoragePath(storagePath: string): boolean {
  return STORAGE_PATH_PATTERN.test(storagePath);
}

/** `2026/10/uuid.webp` → `/uploads/2026/10/uuid.webp` */
export function toPublicUploadPath(storagePath: string): string {
  return `${PUBLIC_UPLOADS_PREFIX}/${storagePath.replace(/^\/+/, "")}`;
}

/**
 * `/uploads/2026/10/uuid.webp` → `2026/10/uuid.webp`.
 * Returns null when the value is not a canonical local upload path or contains
 * traversal sequences/null bytes. External HTTP(S) URLs are rejected.
 */
export function storagePathFromPublicPath(value: string): string | null {
  if (!value || typeof value !== "string" || value.includes("\0") || value.includes("..")) {
    return null;
  }

  // Reject any external URL protocol
  if (/^https?:\/\//i.test(value)) {
    return null;
  }

  const prefix = `${PUBLIC_UPLOADS_PREFIX}/`;
  if (!value.startsWith(prefix)) {
    return isValidStoragePath(value) ? value : null;
  }

  const storagePath = value.slice(prefix.length);
  return isValidStoragePath(storagePath) ? storagePath : null;
}

/** True when the value is a local public upload path such as `/uploads/2026/10/uuid.webp`. */
export function isLocalUploadPath(value: string): boolean {
  if (!value || typeof value !== "string" || !value.startsWith(`${PUBLIC_UPLOADS_PREFIX}/`)) {
    return false;
  }
  return storagePathFromPublicPath(value) !== null;
}

/**
 * Detects the real image format from its magic bytes, independent of the
 * declared MIME type (defense against renamed or spoofed payloads).
 *  - WebP: "RIFF" .... "WEBP"
 *  - JPEG: FF D8 FF
 */
export function detectImageMimeType(bytes: Uint8Array): AllowedUploadMimeType | null {
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  return null;
}
