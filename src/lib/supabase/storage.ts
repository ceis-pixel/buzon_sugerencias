import { STORAGE_BUCKET_NAME } from "@/lib/constants/storage";
import { getSupabasePublicEnv } from "@/lib/env";
import type { ShiftType } from "@/types/database.types";

/**
 * Generates a structured storage path by meal shift and date/UUID to prevent collisions.
 * Example: "breakfast/2026-09-22-a1b2c3d4.webp"
 *
 * @param shift - The meal shift associated with the suggestion
 * @param extension - The file extension (defaults to "webp")
 */
export function generateStoragePath(
  shift: ShiftType | string,
  extension: string = "webp",
): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const randomSuffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).substring(2, 10);
  const cleanExt = extension.replace(/^\.+/, "").toLowerCase();
  const cleanShift = shift.trim().toLowerCase();

  return `${cleanShift}/${dateStr}-${randomSuffix}.${cleanExt}`;
}

/**
 * Resolves the absolute public URL for an asset stored in the suggestion-media bucket.
 * If the path is already an absolute HTTP/HTTPS URL, returns it unchanged.
 *
 * @param path - The relative storage path within the bucket, or an existing full URL
 */
export function getPublicImageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const { url } = getSupabasePublicEnv();
  const cleanPath = path.replace(/^\/+/, "");
  return `${url}/storage/v1/object/public/${STORAGE_BUCKET_NAME}/${cleanPath}`;
}
