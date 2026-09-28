/**
 * Canonical regular expression for student ticket tracking codes.
 * Format: UNSCH-XXXX (10 characters total)
 * Charset excludes visually ambiguous characters: 0, O, 1, I, L
 */
export const TICKET_CODE_REGEX =
  /^UNSCH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/i;

/**
 * Normalizes user-entered ticket code by trimming whitespace and converting to uppercase.
 */
export function normalizeTicketCode(code: string): string {
  if (!code) return "";
  return code.trim().toUpperCase();
}

/**
 * Validates whether a given code complies with the official UNSCH ticket format.
 * Case-insensitive and tolerates surrounding whitespace.
 */
export function isValidTicketCode(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }
  return TICKET_CODE_REGEX.test(normalizeTicketCode(code));
}

/**
 * Generates a valid pseudo-random UNSCH ticket code (e.g. UNSCH-K72M)
 * conforming to TICKET_CODE_REGEX.
 */
export function generateDemoTicketCode(): string {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `UNSCH-${suffix}`;
}
