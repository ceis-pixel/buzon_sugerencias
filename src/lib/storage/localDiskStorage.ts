import "server-only";

import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { getUploadDir } from "@/lib/server-env";
import { isValidStoragePath } from "@/lib/storage/uploadPolicy";

/** Thrown when a storage path is malformed or escapes the uploads root. */
export class InvalidStoragePathError extends Error {
  constructor() {
    super("Ruta de almacenamiento no válida.");
    this.name = "InvalidStoragePathError";
  }
}

/**
 * Resolves a relative storage path inside the uploads root, rejecting anything
 * that contains null bytes, directory traversal sequences, does not match the
 * strict `[folder/]YYYY/MM/uuid.ext` format, fails leaf basename validation,
 * or would escape the root after normalization (defense-in-depth path traversal shield).
 */
export function resolveStoragePath(storagePath: string, root: string = getUploadDir()): string {
  // 1. Defend against null bytes and traversal sequences
  if (
    !storagePath ||
    typeof storagePath !== "string" ||
    storagePath.includes("\0") ||
    storagePath.includes("..")
  ) {
    throw new InvalidStoragePathError();
  }

  // 2. Format validation against whitelist pattern
  if (!isValidStoragePath(storagePath)) {
    throw new InvalidStoragePathError();
  }

  // 3. Basename isolation check
  const baseName = path.basename(storagePath);
  const segments = storagePath.split("/").filter(Boolean);
  if (!baseName || baseName !== segments[segments.length - 1] || baseName.includes("..")) {
    throw new InvalidStoragePathError();
  }

  // 4. Absolute path resolution and directory confinement
  const absoluteRoot = path.resolve(root);
  const absolutePath = path.resolve(absoluteRoot, ...segments);

  const relativeFromRoot = path.relative(absoluteRoot, absolutePath);
  if (
    relativeFromRoot.startsWith("..") ||
    path.isAbsolute(relativeFromRoot) ||
    !absolutePath.startsWith(absoluteRoot + path.sep)
  ) {
    throw new InvalidStoragePathError();
  }

  return absolutePath;
}

/**
 * Persists the image bytes at `<UPLOAD_DIR>/<storagePath>`.
 * Uses the exclusive `wx` flag so an existing file is never overwritten.
 */
export async function saveUpload(
  storagePath: string,
  bytes: Uint8Array,
  root: string = getUploadDir(),
): Promise<string> {
  const absolutePath = resolveStoragePath(storagePath, root);
  await mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o750 });
  await writeFile(absolutePath, bytes, { flag: "wx", mode: 0o640 });
  return absolutePath;
}

/** Reads a stored image. Returns null when the file does not exist. */
export async function readUpload(
  storagePath: string,
  root: string = getUploadDir(),
): Promise<{ bytes: Buffer; size: number; modifiedAt: Date } | null> {
  const absolutePath = resolveStoragePath(storagePath, root);

  try {
    const info = await stat(absolutePath);
    if (!info.isFile()) return null;
    const bytes = await readFile(absolutePath);
    return { bytes, size: info.size, modifiedAt: info.mtime };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Deletes a stored image. Returns false when it did not exist. */
export async function deleteUpload(
  storagePath: string,
  root: string = getUploadDir(),
): Promise<boolean> {
  const absolutePath = resolveStoragePath(storagePath, root);

  try {
    await unlink(absolutePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export interface StoredUpload {
  storagePath: string;
  modifiedAt: Date;
}

/**
 * Lists every stored image under the uploads root as relative storage paths.
 * Entries that do not match the strict upload format are ignored.
 */
export async function listUploads(root: string = getUploadDir()): Promise<StoredUpload[]> {
  const absoluteRoot = path.resolve(root);
  let entries: string[];

  try {
    entries = await readdir(absoluteRoot, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const uploads: StoredUpload[] = [];
  for (const entry of entries) {
    const storagePath = entry.split(path.sep).join("/");
    if (!isValidStoragePath(storagePath)) continue;

    try {
      const info = await stat(path.join(absoluteRoot, entry));
      if (info.isFile()) uploads.push({ storagePath, modifiedAt: info.mtime });
    } catch {
      // Removed concurrently; nothing to report.
    }
  }

  return uploads;
}
