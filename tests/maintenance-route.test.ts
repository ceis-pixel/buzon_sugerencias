import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getVerifiedAdmin: vi.fn(),
  purgeResolvedMedia: vi.fn(),
  fetchReferencedPhotoUrls: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getVerifiedAdmin: mocks.getVerifiedAdmin }));
vi.mock("@/lib/services/suggestionService", () => ({
  purgeResolvedMedia: mocks.purgeResolvedMedia,
  fetchReferencedPhotoUrls: mocks.fetchReferencedPhotoUrls,
}));

import { POST } from "@/app/api/admin/maintenance/route";

const PURGED = "2026/06/11111111-1111-4111-8111-111111111111.webp";
const REFERENCED = "2026/10/22222222-2222-4222-8222-222222222222.webp";
const OLD_ORPHAN = "lunch/2026/09/33333333-3333-4333-8333-333333333333.jpg";
const FRESH_ORPHAN = "2026/10/44444444-4444-4444-8444-444444444444.webp";

let uploadDir: string;

async function store(storagePath: string, ageHours: number): Promise<void> {
  const absolute = path.join(uploadDir, ...storagePath.split("/"));
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, "image");
  const modified = new Date(Date.now() - ageHours * 60 * 60 * 1000);
  await utimes(absolute, modified, modified);
}

async function storedFiles(): Promise<string[]> {
  const entries = await readdir(uploadDir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(uploadDir, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
    .sort();
}

function maintenanceRequest(body?: unknown): Request {
  return new Request("http://localhost/api/admin/maintenance", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), "buzon-maintenance-"));
  vi.stubEnv("UPLOAD_DIR", uploadDir);
  mocks.getVerifiedAdmin.mockResolvedValue({ userEmail: "moderator@unsch.edu.pe" });
  mocks.purgeResolvedMedia.mockResolvedValue({
    purgedCount: 0,
    purgedUrls: [],
    cutoffDate: "2026-07-07T00:00:00.000Z",
    executedAt: "2026-10-05T00:00:00.000Z",
  });
  mocks.fetchReferencedPhotoUrls.mockResolvedValue([]);
});

afterEach(async () => {
  await rm(uploadDir, { recursive: true, force: true });
});

describe("Maintenance route — local purge on the uploads volume", () => {
  it("rejects unauthorized requests before touching the database or the disk", async () => {
    mocks.getVerifiedAdmin.mockResolvedValue(null);
    await store(OLD_ORPHAN, 72);

    const response = await POST(maintenanceRequest());

    expect(response.status).toBe(401);
    expect(mocks.purgeResolvedMedia).not.toHaveBeenCalled();
    expect(await storedFiles()).toEqual([OLD_ORPHAN]);
  });

  it("uses the 90-day default and honors a custom threshold", async () => {
    await POST(maintenanceRequest());
    expect(mocks.purgeResolvedMedia).toHaveBeenLastCalledWith(90);

    await POST(maintenanceRequest({ daysOld: 30.9 }));
    expect(mocks.purgeResolvedMedia).toHaveBeenLastCalledWith(30);

    await POST(maintenanceRequest({ daysOld: -5 }));
    expect(mocks.purgeResolvedMedia).toHaveBeenLastCalledWith(90);
  });

  it("deletes detached photos and stale orphans, keeping referenced and recent files", async () => {
    await store(PURGED, 24 * 120);
    await store(REFERENCED, 24 * 10);
    await store(OLD_ORPHAN, 72);
    await store(FRESH_ORPHAN, 1); // a student may still be filling the form

    mocks.purgeResolvedMedia.mockResolvedValue({
      purgedCount: 2,
      purgedUrls: [
        `/uploads/${PURGED}`,
        "https://legacy.example/storage/v1/object/public/suggestion-media/lunch/old.webp",
      ],
      cutoffDate: "2026-07-07T00:00:00.000Z",
      executedAt: "2026-10-05T00:00:00.000Z",
    });
    mocks.fetchReferencedPhotoUrls.mockResolvedValue([`/uploads/${REFERENCED}`]);

    const response = await POST(maintenanceRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      purgedRecordsCount: 2,
      storageDeletedCount: 2,
      orphanDeletedCount: 1,
      cutoffDate: "2026-07-07T00:00:00.000Z",
    });
    expect(body.freedPaths.sort()).toEqual([PURGED, OLD_ORPHAN].sort());
    expect(await storedFiles()).toEqual([FRESH_ORPHAN, REFERENCED].sort());
  });

  it("answers 500 without leaking details when the database routine fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.purgeResolvedMedia.mockRejectedValue(
      new Error("connect ECONNREFUSED postgresql://user:secret@db:5432"),
    );
    await store(OLD_ORPHAN, 72);

    const response = await POST(maintenanceRequest());
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toContain("secret");
    expect(await storedFiles()).toEqual([OLD_ORPHAN]);
  });
});
