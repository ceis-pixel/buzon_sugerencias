import { getUploadSession, type UploadSessionResult } from "@/lib/auth/uploadSession";
import { deleteUpload, InvalidStoragePathError, saveUpload } from "@/lib/storage/localDiskStorage";
import {
  DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  detectImageMimeType,
  extensionForMimeType,
  generateStoragePath,
  isAllowedUploadFolder,
  isAllowedUploadMimeType,
  storagePathFromPublicPath,
  toPublicUploadPath,
  UPLOAD_FOLDER_FIELD,
  UPLOAD_FORM_FIELD,
} from "@/lib/storage/uploadPolicy";

export const dynamic = "force-dynamic";

/** Multipart envelope overhead tolerated on top of the 500 KB image limit. */
const MULTIPART_OVERHEAD_BYTES = 16 * 1024;

type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "AUTH_UNAVAILABLE"
  | "INVALID_REQUEST"
  | "INVALID_FILE"
  | "INVALID_FORMAT"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_PATH"
  | "NOT_FOUND"
  | "STORAGE_ERROR";

function jsonError(status: number, code: ErrorCode, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function sessionError(session: Exclude<UploadSessionResult, { ok: true }>): Response {
  switch (session.reason) {
    case "auth_unavailable":
      return jsonError(
        503,
        "AUTH_UNAVAILABLE",
        "El servicio de autenticación no está disponible temporalmente. Intenta nuevamente en unos minutos.",
      );
    case "forbidden_domain":
      return jsonError(
        403,
        "FORBIDDEN",
        "Solo las cuentas institucionales pueden adjuntar fotografías.",
      );
    default:
      return jsonError(
        401,
        "UNAUTHORIZED",
        "No cuentas con permisos para subir fotografías. Debes iniciar sesión con tu cuenta institucional.",
      );
  }
}

/**
 * POST /api/upload
 * Receives a client-compressed image (WebP/JPEG ≤ 500 KB) via multipart FormData
 * and stores it at `<UPLOAD_DIR>/[folder/]YYYY/MM/<uuid>.<ext>`.
 */
export async function POST(request: Request): Promise<Response> {
  // 1. Cheap rejection of oversized bodies before buffering anything.
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > DEFAULT_MAX_UPLOAD_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return jsonError(
      413,
      "PAYLOAD_TOO_LARGE",
      "La imagen supera el límite de tamaño permitido por el servidor.",
    );
  }

  // 2. Authenticated institutional session.
  const session = await getUploadSession();
  if (!session.ok) {
    return sessionError(session);
  }

  // 3. Parse multipart payload.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(400, "INVALID_REQUEST", "La solicitud no contiene un formulario válido.");
  }

  const file = formData.get(UPLOAD_FORM_FIELD);
  if (!(file instanceof Blob) || file.size <= 0) {
    return jsonError(400, "INVALID_FILE", "El archivo de imagen está vacío o corrupto.");
  }

  // 4. Defensive validations: size and declared MIME type.
  if (file.size > DEFAULT_MAX_UPLOAD_SIZE_BYTES) {
    return jsonError(
      413,
      "PAYLOAD_TOO_LARGE",
      "La imagen excede el límite permitido de 500 KB tras la compresión. Por favor, intenta con otra foto.",
    );
  }

  if (!isAllowedUploadMimeType(file.type)) {
    return jsonError(
      415,
      "INVALID_FORMAT",
      "Formato de imagen no permitido. Solo se aceptan fotografías en formato WebP o JPEG.",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // 5. Magic-byte verification: the content must really be the declared format.
  if (detectImageMimeType(bytes) !== file.type) {
    return jsonError(
      415,
      "INVALID_FORMAT",
      "El contenido del archivo no corresponde a una imagen WebP o JPEG válida.",
    );
  }

  const folderValue = formData.get(UPLOAD_FOLDER_FIELD);
  const folder = typeof folderValue === "string" && folderValue.trim() ? folderValue.trim() : undefined;
  if (folder && !isAllowedUploadFolder(folder)) {
    return jsonError(400, "INVALID_REQUEST", "La carpeta de destino no es válida.");
  }

  // 6. Persist under an anonymous UUID path (original file name is discarded).
  const storagePath = generateStoragePath(extensionForMimeType(file.type), folder);
  try {
    await saveUpload(storagePath, bytes);
  } catch (error) {
    console.error("[upload] No se pudo guardar la imagen en disco:", (error as Error).message);
    return jsonError(
      500,
      "STORAGE_ERROR",
      "Error al guardar la fotografía en nuestro almacenamiento seguro.",
    );
  }

  const publicPath = toPublicUploadPath(storagePath);
  return Response.json(
    {
      path: publicPath,
      url: publicPath,
      storagePath,
      size: bytes.byteLength,
      contentType: file.type,
    },
    {
      status: 201,
      headers: { "Cache-Control": "no-store", Location: publicPath },
    },
  );
}

/**
 * DELETE /api/upload?path=2026/10/<uuid>.webp
 * Removes a stored image. Restricted to active moderators (mirrors the former
 * `suggestion_media_admin_delete` Storage policy).
 */
export async function DELETE(request: Request): Promise<Response> {
  const session = await getUploadSession({ requireAdminLookup: true });
  if (!session.ok) {
    return sessionError(session);
  }

  if (!session.isAdmin) {
    return jsonError(403, "FORBIDDEN", "Solo los moderadores activos pueden eliminar fotografías.");
  }

  const rawPath = new URL(request.url).searchParams.get("path") ?? "";
  const storagePath = storagePathFromPublicPath(rawPath);
  if (!storagePath) {
    return jsonError(400, "INVALID_PATH", "La ruta de la imagen no es válida.");
  }

  try {
    const deleted = await deleteUpload(storagePath);
    if (!deleted) {
      return jsonError(404, "NOT_FOUND", "La imagen solicitada no existe.");
    }
  } catch (error) {
    if (error instanceof InvalidStoragePathError) {
      return jsonError(400, "INVALID_PATH", "La ruta de la imagen no es válida.");
    }
    console.error("[upload] No se pudo eliminar la imagen:", (error as Error).message);
    return jsonError(500, "STORAGE_ERROR", "No se pudo eliminar la imagen del almacenamiento.");
  }

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
