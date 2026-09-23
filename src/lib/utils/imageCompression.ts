export interface CompressionOptions {
  maxDimension?: number; // Default: 1200
  quality?: number;      // Default: 0.75
  format?: "image/webp" | "image/jpeg";
}

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // Porcentaje de ahorro (ej. 96.5%)
  width: number;
  height: number;
  processingTimeMs: number;
}

interface LoadedImageSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}

const DEFAULT_MAX_DIMENSION = 1200;
const DEFAULT_QUALITY = 0.75;
const DEFAULT_FORMAT: "image/webp" | "image/jpeg" = "image/webp";

/**
 * Calculates scaled dimensions preserving aspect ratio without upscaling.
 */
export function calculateDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number = DEFAULT_MAX_DIMENSION
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0 || maxDimension <= 0) {
    throw new Error("Las dimensiones de la imagen deben ser números positivos.");
  }

  // Do not upscale if image is already smaller than maxDimension in both axes
  if (srcWidth <= maxDimension && srcHeight <= maxDimension) {
    return { width: srcWidth, height: srcHeight };
  }

  const ratio = Math.min(maxDimension / srcWidth, maxDimension / srcHeight);
  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

/**
 * Safely loads image source with EXIF orientation handling where available.
 */
async function loadImageSource(file: File): Promise<LoadedImageSource> {
  // Primary strategy: createImageBitmap with orientation handling
  if (typeof createImageBitmap === "function") {
    try {
      // Modern browsers support imageOrientation: 'from-image'
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          bitmap.close?.();
        },
      };
    } catch {
      // Fallback for browsers that don't support options in createImageBitmap
      try {
        const bitmap = await createImageBitmap(file);
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => {
            bitmap.close?.();
          },
        };
      } catch {
        // Continue to Image fallback below
      }
    }
  }

  // Fallback strategy: HTMLImageElement
  if (typeof Image !== "undefined") {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        resolve({
          source: img,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          cleanup: () => {
            URL.revokeObjectURL(objectUrl);
          },
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("No se pudo cargar la imagen para su procesamiento."));
      };

      img.src = objectUrl;
    });
  }

  throw new Error("El entorno no dispone de APIs para decodificar imágenes.");
}

/**
 * Encodes canvas to Blob with automatic fallback from WebP to JPEG if unsupported.
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: "image/webp" | "image/jpeg",
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== "function") {
      reject(new Error("La API canvas.toBlob no está disponible en este navegador."));
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Error al exportar la imagen optimizada desde el canvas."));
          return;
        }

        // If WebP was requested but browser encoded as image/png (WebP encode unsupported)
        if (format === "image/webp" && blob.type !== "image/webp") {
          canvas.toBlob(
            (fallbackBlob) => {
              if (fallbackBlob) {
                resolve(fallbackBlob);
              } else {
                resolve(blob);
              }
            },
            "image/jpeg",
            quality
          );
          return;
        }

        resolve(blob);
      },
      format,
      quality
    );
  });
}

/**
 * Compresses an image in the browser using the native Canvas API.
 * - Maximum dimension: 1200 px (no upscaling)
 * - Preferred format: WebP (~0.75 quality) with automatic JPEG fallback
 * - Memory efficient and zero external dependencies
 */
export async function compressImage(
  file: File,
  options?: CompressionOptions
): Promise<CompressionResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo seleccionado no es una imagen válida.");
  }

  const startTime = performance.now();

  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const format = options?.format ?? DEFAULT_FORMAT;

  const loadedSource = await loadImageSource(file);

  try {
    const { width, height } = calculateDimensions(
      loadedSource.width,
      loadedSource.height,
      maxDimension
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo inicializar el contexto gráfico del navegador.");
    }

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(loadedSource.source, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, format, quality);

    // Build replacement file name with appropriate extension
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const extension = blob.type === "image/webp" ? ".webp" : ".jpg";
    const outputFileName = `${baseName}${extension}`;

    const compressedFile = new File([blob], outputFileName, {
      type: blob.type,
      lastModified: Date.now(),
    });

    const previewUrl = URL.createObjectURL(blob);
    const originalSize = file.size;
    const compressedSize = blob.size;

    const compressionRatio =
      originalSize > 0
        ? Math.max(0, Number((((originalSize - compressedSize) / originalSize) * 100).toFixed(1)))
        : 0;

    const processingTimeMs = Math.max(1, Math.round(performance.now() - startTime));

    return {
      file: compressedFile,
      previewUrl,
      originalSize,
      compressedSize,
      compressionRatio,
      width,
      height,
      processingTimeMs,
    };
  } finally {
    loadedSource.cleanup();
  }
}
