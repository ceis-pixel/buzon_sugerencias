"use client";

import { useCallback, useEffect, useState } from "react";

import { isValidTicketCode, normalizeTicketCode } from "@/lib/utils/ticket";

const STORAGE_KEY = "unsch_recent_tickets";
const MAX_STORED = 10;

/**
 * React hook that reads and manages the list of recently consulted/submitted ticket
 * codes from localStorage, enabling the Recent Tickets sidebar (Issue 7.5).
 *
 * Handles SSR hydration safely (reads from localStorage only on the client).
 */
export function useRecentTickets() {
  const [recentTickets, setRecentTickets] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const codes = Array.isArray(parsed)
        ? (parsed as unknown[])
            .filter((c): c is string => typeof c === "string" && isValidTicketCode(c))
            .map(normalizeTicketCode)
        : [];
      queueMicrotask(() => {
        setRecentTickets(codes);
        setIsHydrated(true);
      });
    } catch {
      queueMicrotask(() => {
        setRecentTickets([]);
        setIsHydrated(true);
      });
    }
  }, []);

  /**
   * Prepends a ticket code to the list, deduplicating and capping at MAX_STORED.
   */
  const addRecentTicket = useCallback((code: string) => {
    const normalized = normalizeTicketCode(code);
    if (!isValidTicketCode(normalized)) return;

    setRecentTickets((prev) => {
      const filtered = prev.filter((c) => c !== normalized);
      const next = [normalized, ...filtered].slice(0, MAX_STORED);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private browsing or storage quota exceeded — silently continue.
      }
      return next;
    });
  }, []);

  /**
   * Removes a specific ticket code from the recent list.
   */
  const removeRecentTicket = useCallback((code: string) => {
    const normalized = normalizeTicketCode(code);
    setRecentTickets((prev) => {
      const next = prev.filter((c) => c !== normalized);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // no-op
      }
      return next;
    });
  }, []);

  /**
   * Clears all stored recent ticket codes.
   */
  const clearRecentTickets = useCallback(() => {
    setRecentTickets([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
  }, []);

  return {
    recentTickets,
    isHydrated,
    addRecentTicket,
    removeRecentTicket,
    clearRecentTickets,
  };
}
