import {
  ALLOWED_UPLOAD_MIME_TYPES,
  DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  DEFAULT_UPLOAD_TIMEOUT_MS,
  generateStoragePath,
  isAllowedUploadMimeType,
  UPLOAD_ENDPOINT,
  UPLOAD_FOLDER_FIELD,
  UPLOAD_FORM_FIELD,
  type AllowedUploadMimeType,
} from "@/lib/storage/uploadPolicy";

// Re-exported for backwards compatibility with existing imports and tests.
export {
  ALLOWED_UPLOAD_MIME_TYPES,
  DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  DEFAULT_UPLOAD_TIMEOUT_MS,
  generateStoragePath,
  type AllowedUploadMimeType,
};

export interface UploadImageOptions {
  folder?: string;
  maxSizeBytes?: number;
}

export interface ResilientUploadOptions extends UploadImageOptions {
  signal?: AbortSignal;
  onProgress?: (percentage: number) => void;
  timeoutMs?: number; // Default: 15000 (15 seconds)
}

export interface UploadImageResult {
  /** Public path served by the app, e.g. `/uploads/2026/10/uuid.webp`. */
  publicUrl: string;
  /** Relative path inside the uploads volume, e.g. `2026/10/uuid.webp`. */
  storagePath: string;
  fileSize: number;
}

interface UploadApiSuccess {
  path: string;
  storagePath: string;
  size: number;
}

interface UploadApiError {
  error?: { code?: string; message?: string };
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

const ABORTED_MESSAGE = "La subida de la imagen fue cancelada.";
const TIMEOUT_MESSAGE =
  "La conexión tardó demasiado tiempo. Comprueba tu señal móvil e intenta nuevamente.";
const NETWORK_MESSAGE =
  "No se pudo subir la imagen por problemas de conexión. Por favor, reintenta el envío.";

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** Translates an HTTP error from /api/upload into a student-friendly StorageUploadError. */
function toUploadError(status: number, body: UploadApiError | null): StorageUploadError {
  const serverMessage = body?.error?.message;
  const serverCode = body?.error?.code;

  if (status === 413) {
    return new StorageUploadError(
      serverMessage ?? "La imagen supera el límite de tamaño permitido por el servidor.",
      "PAYLOAD_TOO_LARGE",
      413
    );
  }

  if (status === 401 || status === 403) {
    return new StorageUploadError(
      serverMessage ??
        "No cuentas con permisos para subir fotografías. Debes iniciar sesión con tu cuenta institucional.",
      "UNAUTHORIZED",
      status
    );
  }

  if (status === 415) {
    return new StorageUploadError(
      serverMessage ??
        "Formato de imagen no permitido. Solo se aceptan fotografías en formato WebP o JPEG.",
      "INVALID_FORMAT",
      415
    );
  }

  if (status === 408 || status === 504) {
    return new StorageUploadError(TIMEOUT_MESSAGE, "TIMEOUT_ERROR", status);
  }

  if (status === 503) {
    return new StorageUploadError(
      serverMessage ?? "El almacenamiento no se encuentra disponible temporalmente.",
      "SERVICE_UNAVAILABLE",
      503
    );
  }

  return new StorageUploadError(
    serverMessage ?? "Error al subir la fotografía a nuestro almacenamiento seguro.",
    serverCode ?? "UPLOAD_FAILED",
    status
  );
}

/**
 * Uploads an optimized suggestion photo to the institutional on-premise storage
 * through the internal `/api/upload` Route Handler (persisted in the `app_uploads`
 * Docker volume). Enforces defensive size and format validations, timeout
 * protection, and abort handling before any byte leaves the device.
 */
export async function uploadSuggestionImage(
  file: File | Blob,
  options?: ResilientUploadOptions
): Promise<UploadImageResult> {
  // Check abort status immediately before doing any work
  if (options?.signal?.aborted) {
    throw new StorageUploadError(ABORTED_MESSAGE, "ABORTED");
  }

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
  if (!isAllowedUploadMimeType(fileType)) {
    throw new StorageUploadError(
      "Formato de imagen no permitido. Solo se aceptan fotografías en formato WebP o JPEG.",
      "INVALID_FORMAT",
      415
    );
  }

  // 3. Build multipart payload (the server assigns the anonymous UUID file name)
  const payload =
    file.type === fileType ? file : new Blob([file], { type: fileType });
  const formData = new FormData();
  formData.append(UPLOAD_FORM_FIELD, payload, `upload.${fileType === "image/jpeg" ? "jpg" : "webp"}`);
  if (options?.folder) {
    formData.append(UPLOAD_FOLDER_FIELD, options.folder);
  }

  // 4. Setup progress emulation & a combined timeout/abort controller
  options?.onProgress?.(15);
  let currentProgress = 15;
  const progressInterval = setInterval(() => {
    if (currentProgress < 90) {
      currentProgress = Math.min(90, currentProgress + 15);
      options?.onProgress?.(currentProgress);
    }
  }, 250);

  const controller = new AbortController();
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const abortListener = () => controller.abort();
  options?.signal?.addEventListener("abort", abortListener, { once: true });

  const timeoutMs = options?.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS;
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  try {
    let response: Response;
    try {
      response = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        signal: controller.signal,
      });
    } catch (err) {
      if (timedOut) {
        throw new StorageUploadError(TIMEOUT_MESSAGE, "TIMEOUT_ERROR", 408, err);
      }
      if (options?.signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
        throw new StorageUploadError(ABORTED_MESSAGE, "ABORTED", undefined, err);
      }
      throw new StorageUploadError(NETWORK_MESSAGE, "NETWORK_ERROR", undefined, err);
    }

    if (!response.ok) {
      throw toUploadError(response.status, await readJson<UploadApiError>(response));
    }

    const data = await readJson<UploadApiSuccess>(response);
    if (!data?.path || !data.storagePath) {
      throw new StorageUploadError(
        "El servidor devolvió una respuesta inesperada al guardar la fotografía.",
        "UPLOAD_FAILED",
        response.status
      );
    }

    // 5. Complete progress & return the local public path
    options?.onProgress?.(100);

    return {
      publicUrl: data.path,
      storagePath: data.storagePath,
      fileSize: data.size ?? file.size,
    };
  } finally {
    clearInterval(progressInterval);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    options?.signal?.removeEventListener("abort", abortListener);
  }
}

/**
 * Deletes a suggestion image from the on-premise storage. Useful for rollback or
 * when discarding an already-uploaded orphan image. Requires a moderator session.
 */
export async function deleteSuggestionImage(storagePath: string): Promise<void> {
  if (!storagePath) return;

  let response: Response;
  try {
    response = await fetch(
      `${UPLOAD_ENDPOINT}?path=${encodeURIComponent(storagePath)}`,
      { method: "DELETE", credentials: "same-origin" }
    );
  } catch (err) {
    throw new StorageUploadError(
      "No se pudo eliminar la imagen del almacenamiento.",
      "DELETE_ERROR",
      undefined,
      err
    );
  }

  if (!response.ok && response.status !== 404) {
    throw new StorageUploadError(
      "No se pudo eliminar la imagen del almacenamiento.",
      "DELETE_ERROR",
      response.status
    );
  }
}
