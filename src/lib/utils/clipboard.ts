/**
 * Resilient copy-to-clipboard utility.
 * Supports modern navigator.clipboard.writeText with a robust fallback
 * to document.execCommand('copy') for older mobile webviews or non-secure contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) {
    return false;
  }

  // Guard against non-browser environments
  if (typeof window === "undefined" && typeof document === "undefined") {
    return false;
  }

  // 1. Try modern async Clipboard API
  if (
    typeof navigator !== "undefined" &&
    navigator?.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy fallback
    }
  }

  // 2. Legacy fallback using invisible textarea
  if (typeof document !== "undefined" && document?.body) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      return Boolean(successful);
    } catch {
      return false;
    }
  }

  return false;
}
