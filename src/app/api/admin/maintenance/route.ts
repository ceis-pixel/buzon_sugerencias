import { NextResponse } from "next/server";

import { getVerifiedAdmin } from "@/lib/auth/session";
import {
  fetchReferencedPhotoUrls,
  purgeResolvedMedia,
} from "@/lib/services/suggestionService";
import { deleteUpload, listUploads } from "@/lib/storage/localDiskStorage";
import { storagePathFromPublicPath } from "@/lib/storage/uploadPolicy";

export const dynamic = "force-dynamic";

/**
 * Files younger than this are never treated as orphans: a student may have
 * uploaded the photo and still be completing the form.
 */
const ORPHAN_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

async function deleteFiles(storagePaths: readonly string[]): Promise<string[]> {
  const deleted: string[] = [];

  for (const storagePath of storagePaths) {
    try {
      if (await deleteUpload(storagePath)) {
        deleted.push(storagePath);
      }
    } catch (error) {
      console.warn("[StorageMaintenance] Local removal warning:", (error as Error).message);
    }
  }

  return deleted;
}

/**
 * Issue 10.4 — Admin Storage Maintenance Endpoint
 *
 * Keeps the on-premise media volume (/app/uploads) bounded:
 * - Detaches photos from resolved suggestions older than `daysOld` days
 *   (text and responses are retained) and deletes those files from disk.
 * - Deletes orphan files: uploads older than 24 hours that no suggestion references.
 */
export async function POST(request: Request) {
  try {
    const admin = await getVerifiedAdmin();
    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Acceso no autorizado. Se requieren credenciales de moderador activo.",
        },
        { status: 401 },
      );
    }

    let daysOld = 90;
    try {
      const body = await request.json();
      if (typeof body?.daysOld === "number" && body.daysOld >= 0) {
        daysOld = Math.floor(body.daysOld);
      }
    } catch {
      // Body is optional; fallback to default 90 days
    }

    // 1. Detach old media references in the database
    let purge: Awaited<ReturnType<typeof purgeResolvedMedia>>;
    try {
      purge = await purgeResolvedMedia(daysOld);
    } catch (error) {
      console.error("[StorageMaintenance] Database error:", (error as Error).message);
      return NextResponse.json(
        {
          success: false,
          error: "Error al ejecutar la rutina de base de datos para depuración de medios.",
        },
        { status: 500 },
      );
    }

    // 2. Physically remove the detached files from the uploads volume
    const detachedPaths = purge.purgedUrls
      .map((url) => storagePathFromPublicPath(url))
      .filter((storagePath): storagePath is string => storagePath !== null);
    const freedPaths = await deleteFiles(detachedPaths);

    // 3. Remove orphan files that no suggestion references anymore
    const referenced = new Set(
      (await fetchReferencedPhotoUrls())
        .map((url) => storagePathFromPublicPath(url))
        .filter((storagePath): storagePath is string => storagePath !== null),
    );
    const orphanCutoff = Date.now() - ORPHAN_GRACE_PERIOD_MS;
    const orphanPaths = (await listUploads())
      .filter(
        (upload) =>
          !referenced.has(upload.storagePath) && upload.modifiedAt.getTime() <= orphanCutoff,
      )
      .map((upload) => upload.storagePath);
    const orphansDeleted = await deleteFiles(orphanPaths);

    return NextResponse.json({
      success: true,
      message: `Mantenimiento completado con éxito. Se depuraron ${purge.purgedCount} registros fotográficos mayores a ${daysOld} días.`,
      purgedRecordsCount: purge.purgedCount,
      storageDeletedCount: freedPaths.length + orphansDeleted.length,
      orphanDeletedCount: orphansDeleted.length,
      freedPaths: [...freedPaths, ...orphansDeleted],
      cutoffDate: purge.cutoffDate,
      executedAt: purge.executedAt,
    });
  } catch (error) {
    console.error("[StorageMaintenance] Unexpected error:", (error as Error).message);
    return NextResponse.json(
      {
        success: false,
        error: "Ocurrió un error inesperado al ejecutar el mantenimiento de almacenamiento.",
      },
      { status: 500 },
    );
  }
}
