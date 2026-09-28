"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuggestionDraft {
  /** Free-form text of the suggestion (required). */
  text: string;
  /** Meal turn selected by the student. */
  turn: "desayuno" | "almuerzo" | "cena" | "";
  /** Optional category tag. */
  category: string;
  /** ISO timestamp of last save. */
  savedAt: string;
}

export interface UseSuggestionDraftReturn {
  /** Current in-memory draft values. */
  draft: SuggestionDraft;
  /** True when a draft was loaded from sessionStorage on mount. */
  hasDraft: boolean;
  /** Update one or more fields and auto-persist to sessionStorage. */
  updateDraft: (patch: Partial<Omit<SuggestionDraft, "savedAt">>) => void;
  /** Remove the draft from sessionStorage and reset to empty state. */
  clearDraft: () => void;
  /** Manually force a persist (useful before async form submission). */
  persistNow: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAFT_KEY = "buzon_suggestion_draft_v1";

const EMPTY_DRAFT: SuggestionDraft = {
  text: "",
  turn: "",
  category: "",
  savedAt: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadFromStorage(): SuggestionDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    // Minimal structural validation to guard against corrupt data
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "text" in parsed &&
      "turn" in parsed &&
      "savedAt" in parsed
    ) {
      return parsed as SuggestionDraft;
    }
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(draft: SuggestionDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // sessionStorage quota exceeded or private browsing restriction — silently ignore.
  }
}

function removeFromStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Silently ignore
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages ephemeral form-draft persistence using `sessionStorage`.
 *
 * Design invariants:
 * - Data is **never** written to `localStorage` to avoid cross-session leaks.
 * - `sessionStorage` is tab-scoped, so multiple open tabs don't interfere.
 * - The hook auto-saves on every `updateDraft` call, debounced at 300 ms
 *   to prevent excessive I/O while the student types their suggestion.
 * - Calling `clearDraft` both resets in-memory state and removes the stored
 *   key, ensuring nothing survives after a successful submission.
 */
export function useSuggestionDraft(): UseSuggestionDraftReturn {
  // Initialise synchronously from sessionStorage to avoid flicker on mount
  const [draft, setDraft] = useState<SuggestionDraft>(() => {
    return loadFromStorage() ?? { ...EMPTY_DRAFT };
  });

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    return loadFromStorage() !== null;
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a stable reference to latest draft for persistNow
  const draftRef = useRef<SuggestionDraft>(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const persistNow = useCallback(() => {
    saveToStorage({ ...draftRef.current, savedAt: new Date().toISOString() });
  }, []);

  const updateDraft = useCallback(
    (patch: Partial<Omit<SuggestionDraft, "savedAt">>) => {
      setDraft((prev) => {
        const next: SuggestionDraft = {
          ...prev,
          ...patch,
          savedAt: new Date().toISOString(),
        };

        // Debounced write — 300 ms after last keystroke
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          saveToStorage(next);
          setHasDraft(true);
        }, 300);

        return next;
      });
    },
    []
  );

  const clearDraft = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    removeFromStorage();
    setDraft({ ...EMPTY_DRAFT });
    setHasDraft(false);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return {
    draft,
    hasDraft,
    updateDraft,
    clearDraft,
    persistNow,
  };
}
