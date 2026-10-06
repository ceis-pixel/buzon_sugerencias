/**
 * Buzón de Sugerencias - Comedor UNSCH
 * Automated Maintenance, Storage Pruning & Ephemeral Hash Purge
 * (Ley N.° 29733, RPO < 24h, RTO < 30m, OTI UNSCH SRE Policy)
 */

import { query } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  fetchReferencedPhotoUrls,
  purgeResolvedMedia,
} from "@/lib/services/suggestionService";
import { deleteUpload, listUploads, type StoredUpload } from "@/lib/storage/localDiskStorage";
import { storagePathFromPublicPath } from "@/lib/storage/uploadPolicy";

/** Default grace period for orphan files: 24 hours (86,400,000 ms) */
export const DEFAULT_ORPHAN_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/** Default retention for ephemeral rate limit hashes: 48 hours */
export const DEFAULT_EPHEMERAL_MAX_AGE_HOURS = 48;

/** Default age threshold for dissociating resolved suggestion photos: 90 days */
export const DEFAULT_RESOLVED_MEDIA_DAYS = 90;

export interface EphemeralPurgeResult {
  submissionLimitsDeleted: number;
  menuRatingLimitsDeleted: number;
}

/**
 * Purges ephemeral anti-spam rate limit hashes older than `maxAgeHours` (default: 48h).
 * Once a day has passed, these hashes have no operational utility and are pruned to save space.
 */
export async function purgeEphemeralLimits(
  maxAgeHours = DEFAULT_EPHEMERAL_MAX_AGE_HOURS,
): Promise<EphemeralPurgeResult> {
  const hours = Math.max(1, Math.floor(maxAgeHours));

  // 1. Purge submission rate limits older than threshold
  const subRows = await query<{ count: number }>(
    `WITH deleted AS (
       DELETE FROM public.submission_rate_limits
        WHERE created_at <= now() - make_interval(hours => $1::int)
           OR submission_date < CURRENT_DATE - make_interval(hours => $1::int)
        RETURNING 1
     )
     SELECT count(*)::int AS count FROM deleted`,
    [hours],
  );

  // 2. Purge menu rating limits older than threshold
  const ratingRows = await query<{ count: number }>(
    `WITH deleted AS (
       DELETE FROM public.menu_rating_limits
        WHERE created_at <= now() - make_interval(hours => $1::int)
           OR rating_date < CURRENT_DATE - make_interval(hours => $1::int)
        RETURNING 1
     )
     SELECT count(*)::int AS count FROM deleted`,
    [hours],
  );

  const result: EphemeralPurgeResult = {
    submissionLimitsDeleted: subRows[0]?.count ?? 0,
    menuRatingLimitsDeleted: ratingRows[0]?.count ?? 0,
  };

  logger.info("Maintenance:EphemeralPurge", "Pruned expired rate limit hashes", result);
  return result;
}

/**
 * Pure helper to identify orphan uploads on disk.
 * Returns the storage paths of files on disk that are NOT referenced in active suggestions
 * and whose modification date is older than `gracePeriodMs`.
 */
export function identifyOrphanUploads(
  diskFiles: readonly StoredUpload[],
  referencedUrls: readonly string[],
  gracePeriodMs = DEFAULT_ORPHAN_GRACE_PERIOD_MS,
  now = Date.now(),
): string[] {
  const referencedSet = new Set<string>();

  for (const url of referencedUrls) {
    if (!url) continue;
    const normalized = storagePathFromPublicPath(url) ?? url.replace(/^\/+/, "").replace(/^uploads\//, "");
    if (normalized) {
      referencedSet.add(normalized);
    }
  }

  const cutoff = now - Math.max(0, gracePeriodMs);

  return diskFiles
    .filter((file) => {
      const isReferenced = referencedSet.has(file.storagePath);
      const isOlderThanGracePeriod = file.modifiedAt.getTime() <= cutoff;
      return !isReferenced && isOlderThanGracePeriod;
    })
    .map((file) => file.storagePath);
}

/**
 * Deletes a list of storage paths from the local disk volume.
 */
export async function deleteFiles(storagePaths: readonly string[]): Promise<string[]> {
  const deleted: string[] = [];

  for (const storagePath of storagePaths) {
    try {
      if (await deleteUpload(storagePath)) {
        deleted.push(storagePath);
      }
    } catch (error) {
      logger.warn("Maintenance:FileRemoval", `Failed to delete ${storagePath}`, {
        error: (error as Error).message,
      });
    }
  }

  return deleted;
}

export interface MaintenanceReport {
  success: boolean;
  timestamp: string;
  ephemeralPurge: EphemeralPurgeResult;
  mediaPurge: {
    resolvedRecordsPurged: number;
    storageFilesDeleted: number;
  };
  orphanPurge: {
    orphanFilesDeleted: number;
    freedPaths: string[];
  };
}

/**
 * Master nightly maintenance routine:
 * 1. Purges ephemeral rate limit hashes older than 48 hours.
 * 2. Dissociates photos from resolved suggestions older than 90 days and unlinks files.
 * 3. Identifies and unlinks unreferenced orphan images in /app/uploads.
 */
export async function executeNightlyMaintenance(options?: {
  daysOldResolved?: number;
  orphanGracePeriodMs?: number;
  ephemeralHours?: number;
}): Promise<MaintenanceReport> {
  const daysOld = options?.daysOldResolved ?? DEFAULT_RESOLVED_MEDIA_DAYS;
  const orphanGraceMs = options?.orphanGracePeriodMs ?? DEFAULT_ORPHAN_GRACE_PERIOD_MS;
  const ephemeralHours = options?.ephemeralHours ?? DEFAULT_EPHEMERAL_MAX_AGE_HOURS;

  const timestamp = new Date().toISOString();

  try {
    // 1. Purge ephemeral hashes
    const ephemeralResult = await purgeEphemeralLimits(ephemeralHours);

    // 2. Dissociate photos from resolved suggestions > 90 days
    const mediaPurgeResult = await purgeResolvedMedia(daysOld);
    const detachedPaths = mediaPurgeResult.purgedUrls
      .map((url) => storagePathFromPublicPath(url))
      .filter((p): p is string => p !== null);
    const detachedFilesDeleted = await deleteFiles(detachedPaths);

    // 3. Purge orphan images (unreferenced & older than grace period)
    const referencedUrls = await fetchReferencedPhotoUrls();
    const diskUploads = await listUploads();
    const orphanPaths = identifyOrphanUploads(diskUploads, referencedUrls, orphanGraceMs);
    const orphanFilesDeleted = await deleteFiles(orphanPaths);

    const report: MaintenanceReport = {
      success: true,
      timestamp,
      ephemeralPurge: ephemeralResult,
      mediaPurge: {
        resolvedRecordsPurged: mediaPurgeResult.purgedCount,
        storageFilesDeleted: detachedFilesDeleted.length,
      },
      orphanPurge: {
        orphanFilesDeleted: orphanFilesDeleted.length,
        freedPaths: orphanFilesDeleted,
      },
    };

    logger.info("Maintenance:NightlyCleanup", "Completed nightly maintenance successfully", report);
    return report;
  } catch (error) {
    logger.error("Maintenance:NightlyCleanup", "Maintenance failed with unexpected error", error);
    throw error;
  }
}
