"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return typeof window !== "undefined" ? !window.navigator.onLine : false;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Issue 9.5 — OfflineBanner
 *
 * Real-time network connectivity detector for dining hall environments.
 * The dining hall suffers from intermittent cellular connectivity (2G/3G dead spots).
 * When offline, provides immediate reassurance that user drafts are saved locally
 * via sessionStorage / localStorage.
 */
export function OfflineBanner() {
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isOffline) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="assertive"
      className="print:hidden sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-800/40 bg-primary px-4 py-2 text-center text-xs font-semibold text-white shadow-sm transition-all"
    >
      <WifiOff className="size-4 shrink-0 animate-pulse text-amber-300" aria-hidden="true" />
      <span>Sin conexión a internet. Tu borrador está guardado localmente.</span>
    </aside>
  );
}
