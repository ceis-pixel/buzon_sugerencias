"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  StorageUploadError,
  uploadSuggestionImage,
  type UploadImageResult,
} from "@/lib/services/storageService";

export type UploadStatus = "idle" | "uploading" | "success" | "error" | "retrying";

export interface UseResilientUploadReturn {
  status: UploadStatus;
  progress: number;
  error: string | null;
  uploadResult: UploadImageResult | null;
  startUpload: (file: File) => Promise<UploadImageResult | null>;
  retryUpload: () => Promise<UploadImageResult | null>;
  cancelUpload: () => void;
  reset: () => void;
}

/**
 * Custom React hook for resilient image uploads in unstable mobile environments.
 * Manages AbortController, progress tracking, defensive timeouts, and in-memory retry.
 */
export function useResilientUpload(): UseResilientUploadReturn {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadImageResult | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFileRef = useRef<File | null>(null);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("idle");
    setProgress(0);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    cancelUpload();
    lastFileRef.current = null;
    setUploadResult(null);
  }, [cancelUpload]);

  const executeUpload = useCallback(
    async (file: File, isRetry = false): Promise<UploadImageResult | null> => {
      // Abort any existing upload before launching a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      lastFileRef.current = file;

      setStatus(isRetry ? "retrying" : "uploading");
      setProgress(5);
      setError(null);

      try {
        const result = await uploadSuggestionImage(file, {
          signal: controller.signal,
          onProgress: (p) => setProgress(p),
          timeoutMs: 15000, // 15-second defensive timeout
        });

        abortControllerRef.current = null;
        setUploadResult(result);
        setProgress(100);
        setStatus("success");
        return result;
      } catch (err) {
        // If aborted by user, reset gracefully to idle
        if (
          err instanceof StorageUploadError &&
          err.code === "ABORTED"
        ) {
          setStatus("idle");
          setProgress(0);
          setError(null);
          return null;
        }

        const message =
          err instanceof Error
            ? err.message
            : "No se pudo completar la subida. Verifica tu conexión.";

        setStatus("error");
        setError(message);
        return null;
      }
    },
    []
  );

  const startUpload = useCallback(
    (file: File) => executeUpload(file, false),
    [executeUpload]
  );

  const retryUpload = useCallback(() => {
    if (!lastFileRef.current) return Promise.resolve(null);
    return executeUpload(lastFileRef.current, true);
  }, [executeUpload]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    status,
    progress,
    error,
    uploadResult,
    startUpload,
    retryUpload,
    cancelUpload,
    reset,
  };
}
