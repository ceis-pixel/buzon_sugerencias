"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  compressImage,
  type CompressionOptions,
  type CompressionResult,
} from "@/lib/utils/imageCompression";

export interface UseImageCompressorReturn {
  isCompressing: boolean;
  error: string | null;
  result: CompressionResult | null;
  compress: (file: File, options?: CompressionOptions) => Promise<CompressionResult | null>;
  clear: () => void;
}

/**
 * Custom hook to compress images on the client using the Canvas API.
 * Manages reactive state and automatically frees memory by revoking object URLs.
 */
export function useImageCompressor(): UseImageCompressorReturn {
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);

  // Keep a reference to the active preview URL for leak-free cleanups
  const activeUrlRef = useRef<string | null>(null);

  const revokeCurrentUrl = useCallback(() => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    revokeCurrentUrl();
    setResult(null);
    setError(null);
  }, [revokeCurrentUrl]);

  const compress = useCallback(
    async (file: File, options?: CompressionOptions): Promise<CompressionResult | null> => {
      setIsCompressing(true);
      setError(null);

      // Clean up previous compression result URL before starting a new one
      revokeCurrentUrl();

      try {
        const compressionResult = await compressImage(file, options);
        activeUrlRef.current = compressionResult.previewUrl;
        setResult(compressionResult);
        return compressionResult;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Ocurrió un error inesperado al comprimir la imagen.";
        setError(message);
        setResult(null);
        return null;
      } finally {
        setIsCompressing(false);
      }
    },
    [revokeCurrentUrl]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokeCurrentUrl();
    };
  }, [revokeCurrentUrl]);

  return {
    isCompressing,
    error,
    result,
    compress,
    clear,
  };
}
