/**
 * Defensive input sanitization utilities against Cross-Site Scripting (XSS)
 * and content injection (Ley de Gobierno Digital / OTI UNSCH security baseline).
 */

/**
 * Escapes dangerous HTML entities and strips null bytes from untrusted text input.
 * Neutralizes <script>, <iframe>, <img onerror=...>, event handlers, and tag injection.
 * Safe for storing in database and rendering across SSR, client components, and export reports.
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .replace(/\0/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Normalizes and sanitizes user-submitted free text fields (e.g., student message,
 * official commission response). Trims whitespace and escapes dangerous entities.
 */
export function sanitizeUserText(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return sanitizeHtml(input.trim());
}
