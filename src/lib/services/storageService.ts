import type { SupabaseClient } from "@supabase/supabase-js";

import { STORAGE_BUCKET_NAME } from "@/lib/constants/storage";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 500 * 1024; // 500 KB limit for compressed uploads
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/webp",
  "image/jpeg",
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

export interface UploadImageOptions {
  folder?: string;
  maxSizeBytes?: number;
  client?: SupabaseClient<Database>;
}

export interface UploadImageResult {
  publicUrl: string;
  storagePath: string;
  fileSize: number;
}

/**
 * Custom error class with structured status codes and friendly localized messages.
 */
export class StorageUploadError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(
    message: string,
    code: string = "UPLOAD_ERROR",
    status?: number,
    cause?: unknown
  ) {
    super(message);
    this.name = "StorageUploadError";
    this.code = code;
    this.status = status;
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * Generates an anonymous, date-partitioned storage path using UUID v4.
 * Format: `YYYY/MM/uuid-v4.webp` (or `${folder}/YYYY/MM/uuid-v4.webp`)
 *
 * Discards local file names completely to guarantee student anonymity and avoid collisions.
 */
export function generateStoragePath(
  extension: string = "webp",
  folder?: string
): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

  const cleanExt = extension.replace(/^\.+/, "").toLowerCase();

  if (folder) {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
    return `${cleanFolder}/${year}/${month}/${uuid}.${cleanExt}`;
  }

  return `${year}/${month}/${uuid}.${cleanExt}`;
}

/**
 * Uploads an optimized suggestion photo to the `suggestion-media` Supabase Storage bucket.
 * Enforces defensive size and format validations before hitting the network.
 */
export async function uploadSuggestionImage(
  file: File | Blob,
  options?: UploadImageOptions
): Promise<UploadImageResult> {
  if (!file || file.size <= 0) {
    throw new StorageUploadError(
      "El archivo de imagen está vacío o corrupto.",
      "INVALID_FILE"
    );
  }

  // 1. Validate maximum size limit (default: 500 KB)
  const maxBytes = options?.maxSizeBytes ?? DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  if (file.size > maxBytes) {
    throw new StorageUploadError(
      "La imagen excede el límite permitido de 500 KB tras la compresión. Por favor, intenta con otra foto.",
      "PAYLOAD_TOO_LARGE",
      413
    );
  }

  // 2. Validate strict allowed MIME type
  const fileType = file.type || "image/webp";
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(fileType as AllowedUploadMimeType)) {
    throw new StorageUploadError(
      "Formato de imagen no permitido. Solo se aceptan fotografías en formato WebP o JPEG.",
      "INVALID_FORMAT",
      415
    );
  }

  // 3. Determine file extension
  const extension = fileType === "image/jpeg" ? "jpg" : "webp";
  const storagePath = generateStoragePath(extension, options?.folder);

  // 4. Resolve client and upload to Supabase Storage
  const supabase = options?.client ?? createClient();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: fileType,
      cacheControl: "31536000", // 1 year CDN cache
      upsert: false,
    });

  if (uploadError) {
    const errorMessage = uploadError.message?.toLowerCase() || "";
    const statusCode = (uploadError as unknown as { statusCode?: number }).statusCode;

    if (statusCode === 413 || errorMessage.includes("payload too large") || errorMessage.includes("entity too large")) {
      throw new StorageUploadError(
        "La imagen supera el límite de tamaño permitido por el servidor.",
        "PAYLOAD_TOO_LARGE",
        413,
        uploadError
      );
    }

    if (
      statusCode === 401 ||
      statusCode === 403 ||
      errorMessage.includes("row-level security") ||
      errorMessage.includes("policy") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("permission denied")
    ) {
      throw new StorageUploadError(
        "No cuentas con permisos para subir fotografías. Debes iniciar sesión con tu cuenta institucional.",
        "UNAUTHORIZED",
        403,
        uploadError
      );
    }

    if (errorMessage.includes("bucket not found")) {
      throw new StorageUploadError(
        "El contenedor de almacenamiento no se encuentra disponible temporalmente.",
        "BUCKET_NOT_FOUND",
        404,
        uploadError
      );
    }

    if (errorMessage.includes("failed to fetch") || errorMessage.includes("network") || errorMessage.includes("timeout")) {
      throw new StorageUploadError(
        "No se pudo subir la imagen por problemas de conexión. Por favor, reintenta el envío.",
        "NETWORK_ERROR",
        undefined,
        uploadError
      );
    }

    throw new StorageUploadError(
      uploadError.message || "Error al subir la fotografía a nuestro almacenamiento seguro.",
      "UPLOAD_FAILED",
      statusCode,
      uploadError
    );
  }

  // 5. Retrieve public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .getPublicUrl(storagePath);

  return {
    publicUrl: urlData.publicUrl,
    storagePath,
    fileSize: file.size,
  };
}

/**
 * Deletes a suggestion image from storage. Useful for rollback or when discarding
 * an already-uploaded orphan image.
 */
export async function deleteSuggestionImage(
  storagePath: string,
  client?: SupabaseClient<Database>
): Promise<void> {
  if (!storagePath) return;

  const supabase = client ?? createClient();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    throw new StorageUploadError(
      "No se pudo eliminar la imagen del almacenamiento.",
      "DELETE_ERROR",
      undefined,
      error
    );
  }
}
