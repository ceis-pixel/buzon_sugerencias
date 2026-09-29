import { NextResponse } from "next/server";

import { getVerifiedAdmin } from "@/lib/actions/adminActions";
import { STORAGE_BUCKET_NAME } from "@/lib/constants/storage";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Extracts relative storage path from a full public Supabase URL or raw path.
 * E.g., ".../suggestion-media/lunch/2026-09-22-abc.webp" -> "lunch/2026-09-22-abc.webp"
 */
function extractStoragePath(urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  const bucketMarker = `${STORAGE_BUCKET_NAME}/`;
  const idx = urlOrPath.indexOf(bucketMarker);
  if (idx !== -1) {
    return urlOrPath.substring(idx + bucketMarker.length).split("?")[0];
  }
  // If it's already a relative path like "lunch/xxx.webp"
  if (/^(breakfast|lunch|dinner)\//i.test(urlOrPath)) {
    return urlOrPath.split("?")[0];
  }
  return null;
}

/**
 * Issue 10.4 — Admin Storage Maintenance Endpoint
 *
 * Executes the storage cleanup routine to maintain the 1 GB Supabase free tier quota:
 * - Identifies resolved suggestions older than 90 days with media attachments.
 * - Disassociates the media URL from the suggestion record (retaining text and responses).
 * - Physically deletes the media objects from the Supabase Storage bucket.
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

    // 1. Invoke database RPC to purge database references
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      "purge_orphaned_or_old_media",
      { p_days_old: daysOld },
    );

    if (rpcError) {
      console.error("[StorageMaintenance] RPC Error:", rpcError);
      return NextResponse.json(
        {
          success: false,
          error: "Error al ejecutar la rutina de base de datos para depuración de medios.",
          details: rpcError.message,
        },
        { status: 500 },
      );
    }

    const parsedResult = rpcData as {
      success?: boolean;
      purged_count?: number;
      purged_urls?: string[];
      cutoff_date?: string;
      executed_at?: string;
    };

    const purgedUrls = parsedResult?.purged_urls ?? [];
    const pathsToDelete: string[] = [];

    for (const url of purgedUrls) {
      const path = extractStoragePath(url);
      if (path) {
        pathsToDelete.push(path);
      }
    }

    // 2. Physically remove files from Supabase Storage bucket if any were returned
    let storageDeletedCount = 0;
    if (pathsToDelete.length > 0) {
      const { data: storageData, error: storageError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET_NAME)
        .remove(pathsToDelete);

      if (storageError) {
        console.warn("[StorageMaintenance] Storage removal warning:", storageError);
      } else {
        storageDeletedCount = storageData?.length ?? pathsToDelete.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Mantenimiento completado con éxito. Se depuraron ${parsedResult?.purged_count ?? 0} registros fotográficos mayores a ${daysOld} días.`,
      purgedRecordsCount: parsedResult?.purged_count ?? 0,
      storageDeletedCount,
      freedPaths: pathsToDelete,
      cutoffDate: parsedResult?.cutoff_date,
      executedAt: parsedResult?.executed_at ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error("[StorageMaintenance] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Ocurrió un error inesperado al ejecutar el mantenimiento de almacenamiento.",
      },
      { status: 500 },
    );
  }
}
