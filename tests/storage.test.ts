import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  STORAGE_BUCKET_NAME,
} from "@/lib/constants/storage";
import { generateStoragePath, getPublicImageUrl } from "@/lib/supabase/storage";

describe("Storage Constants and Helpers", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyzcompany.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-12345678");
  });

  describe("Constants", () => {
    it("exports canonical bucket name and size constraints", () => {
      expect(STORAGE_BUCKET_NAME).toBe("suggestion-media");
      expect(MAX_FILE_SIZE_BYTES).toBe(1048576); // 1 MB
      expect(ACCEPTED_IMAGE_TYPES).toEqual([
        "image/webp",
        "image/jpeg",
        "image/png",
      ]);
    });
  });

  describe("generateStoragePath", () => {
    it("generates structured path with shift prefix, date, and extension", () => {
      const path = generateStoragePath("lunch", "webp");
      expect(path).toMatch(/^lunch\/\d{4}-\d{2}-\d{2}-[a-z0-9]+\.webp$/);
    });

    it("sanitizes leading dot and uppercase from file extension", () => {
      const path = generateStoragePath("breakfast", ".JPEG");
      expect(path).toMatch(/^breakfast\/\d{4}-\d{2}-\d{2}-[a-z0-9]+\.jpeg$/);
    });

    it("defaults to webp format", () => {
      const path = generateStoragePath("dinner");
      expect(path.endsWith(".webp")).toBe(true);
    });
  });

  describe("getPublicImageUrl", () => {
    it("constructs public Supabase storage URL from relative path", () => {
      const url = getPublicImageUrl("lunch/2026-09-22-test.webp");
      expect(url).toBe(
        "https://xyzcompany.supabase.co/storage/v1/object/public/suggestion-media/lunch/2026-09-22-test.webp",
      );
    });

    it("normalizes leading slash in relative path", () => {
      const url = getPublicImageUrl("/dinner/2026-09-22-test.webp");
      expect(url).toBe(
        "https://xyzcompany.supabase.co/storage/v1/object/public/suggestion-media/dinner/2026-09-22-test.webp",
      );
    });

    it("leaves absolute HTTP/HTTPS URLs untouched", () => {
      const externalUrl = "https://images.unsplash.com/photo-123.jpg";
      expect(getPublicImageUrl(externalUrl)).toBe(externalUrl);
    });

    it("returns empty string when given an empty path", () => {
      expect(getPublicImageUrl("")).toBe("");
    });
  });
});
