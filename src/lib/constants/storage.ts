export const STORAGE_BUCKET_NAME = "suggestion-media";

/** 1 MB in bytes (1024 * 1024) to optimize Supabase free tier storage */
export const MAX_FILE_SIZE_BYTES = 1048576;

/** Allowed MIME types for suggestion photo uploads */
export const ACCEPTED_IMAGE_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/png",
] as const;

export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];
