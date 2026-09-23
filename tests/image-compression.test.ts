import { afterEach, describe, expect, it, vi } from "vitest";

import {
  calculateDimensions,
  compressImage,
} from "@/lib/utils/imageCompression";

describe("calculateDimensions", () => {
  it("scales down large landscape images proportionally to 1200 px max dimension", () => {
    // 4000 x 3000 (aspect 4:3) -> 1200 x 900
    const dimensions = calculateDimensions(4000, 3000, 1200);
    expect(dimensions).toEqual({ width: 1200, height: 900 });
  });

  it("scales down large portrait images proportionally to 1200 px max dimension", () => {
    // 3000 x 4000 (aspect 3:4) -> 900 x 1200
    const dimensions = calculateDimensions(3000, 4000, 1200);
    expect(dimensions).toEqual({ width: 900, height: 1200 });
  });

  it("scales down square images to 1200 x 1200 px", () => {
    const dimensions = calculateDimensions(2500, 2500, 1200);
    expect(dimensions).toEqual({ width: 1200, height: 1200 });
  });

  it("never upscales images that are already smaller than maxDimension in both axes", () => {
    // 800 x 600 stays 800 x 600
    const dimensions = calculateDimensions(800, 600, 1200);
    expect(dimensions).toEqual({ width: 800, height: 600 });

    // 400 x 500 stays 400 x 500
    const portraitSmall = calculateDimensions(400, 500, 1200);
    expect(portraitSmall).toEqual({ width: 400, height: 500 });
  });

  it("keeps dimensions untouched if exactly equal to maxDimension", () => {
    const dimensions = calculateDimensions(1200, 800, 1200);
    expect(dimensions).toEqual({ width: 1200, height: 800 });
  });

  it("supports custom maxDimension values", () => {
    // 1600 x 1200 with max 800 -> 800 x 600
    const dimensions = calculateDimensions(1600, 1200, 800);
    expect(dimensions).toEqual({ width: 800, height: 600 });
  });

  it("throws a descriptive Spanish error if dimensions are zero or negative", () => {
    expect(() => calculateDimensions(0, 500, 1200)).toThrow(
      "Las dimensiones de la imagen deben ser números positivos."
    );
    expect(() => calculateDimensions(500, -10, 1200)).toThrow(
      "Las dimensiones de la imagen deben ser números positivos."
    );
    expect(() => calculateDimensions(500, 500, 0)).toThrow(
      "Las dimensiones de la imagen deben ser números positivos."
    );
  });
});

describe("compressImage validation", () => {
  it("rejects non-image files with a descriptive Spanish error", async () => {
    const fakePdf = new File(["fake content"], "documento.pdf", {
      type: "application/pdf",
    });

    await expect(compressImage(fakePdf)).rejects.toThrow(
      "El archivo seleccionado no es una imagen válida."
    );
  });
});

describe("compressImage with mocked browser canvas API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("successfully compresses an image, updates extension to .webp, and calculates metrics", async () => {
    // Mock createImageBitmap
    const mockBitmap = {
      width: 4000,
      height: 3000,
      close: vi.fn(),
    };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(mockBitmap));

    // Mock document.createElement('canvas')
    const mockCtx = {
      drawImage: vi.fn(),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    };

    const mockBlob = new Blob(["mock-webp-data-stream"], { type: "image/webp" });
    Object.defineProperty(mockBlob, "size", { value: 125000 }); // ~122 KB

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn((callback: (b: Blob | null) => void) => {
        callback(mockBlob);
      }),
    };

    vi.stubGlobal("document", {
      createElement: vi.fn((tagName: string) => {
        if (tagName === "canvas") {
          return mockCanvas as unknown as HTMLCanvasElement;
        }
        return {};
      }),
    });

    // Mock URL.createObjectURL and revokeObjectURL
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:http://localhost/mock-preview-id"),
      revokeObjectURL: vi.fn(),
    });

    // 5 MB sample photo
    const largeOriginalFile = new File(
      [new Uint8Array(5 * 1024 * 1024)],
      "foto_almuerzo_bandeja.jpg",
      { type: "image/jpeg" }
    );

    const result = await compressImage(largeOriginalFile, {
      maxDimension: 1200,
      quality: 0.75,
      format: "image/webp",
    });

    // Validations
    expect(result.file.name).toBe("foto_almuerzo_bandeja.webp");
    expect(result.file.type).toBe("image/webp");
    expect(result.width).toBe(1200);
    expect(result.height).toBe(900);
    expect(result.originalSize).toBe(5 * 1024 * 1024);
    expect(result.compressedSize).toBe(125000);
    expect(result.compressionRatio).toBeGreaterThan(90);
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(1);
    expect(result.previewUrl).toBe("blob:http://localhost/mock-preview-id");

    // Canvas drew with scaled dimensions
    expect(mockCanvas.width).toBe(1200);
    expect(mockCanvas.height).toBe(900);
    expect(mockCtx.drawImage).toHaveBeenCalledWith(mockBitmap, 0, 0, 1200, 900);

    // Bitmap memory cleaned up
    expect(mockBitmap.close).toHaveBeenCalled();
  });

  it("transparently falls back to image/jpeg if browser cannot encode WebP", async () => {
    const mockBitmap = {
      width: 2000,
      height: 1000,
      close: vi.fn(),
    };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(mockBitmap));

    const mockJpegBlob = new Blob(["mock-jpeg-data"], { type: "image/jpeg" });
    Object.defineProperty(mockJpegBlob, "size", { value: 95000 });

    // When requested 'image/webp', browser returns 'image/png' (unsupported webp export)
    // Then canvasToBlob re-requests 'image/jpeg'
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
      }),
      toBlob: vi.fn(
        (
          callback: (b: Blob | null) => void,
          format?: string
        ) => {
          if (format === "image/webp") {
            const pngBlob = new Blob(["png"], { type: "image/png" });
            callback(pngBlob);
          } else {
            callback(mockJpegBlob);
          }
        }
      ),
    };

    vi.stubGlobal("document", {
      createElement: vi.fn((tagName: string) => {
        if (tagName === "canvas") {
          return mockCanvas as unknown as HTMLCanvasElement;
        }
        return {};
      }),
    });

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:http://localhost/fallback-jpeg"),
      revokeObjectURL: vi.fn(),
    });

    const testFile = new File([new Uint8Array(1000000)], "foto_menu.png", {
      type: "image/png",
    });

    const result = await compressImage(testFile);

    expect(result.file.name).toBe("foto_menu.jpg");
    expect(result.file.type).toBe("image/jpeg");
    expect(result.width).toBe(1200);
    expect(result.height).toBe(600);
  });
});
