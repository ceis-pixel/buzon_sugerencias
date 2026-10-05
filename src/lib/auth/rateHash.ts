import "server-only";

import { createHmac } from "node:crypto";

import { getRateLimitSecret } from "@/lib/server-env";
import type { ShiftType } from "@/types/database.types";

/**
 * Cryptographic dissociation (Ley N.º 29733).
 *
 * The verified institutional e-mail never reaches the suggestions or ratings
 * tables. Anti-spam quotas are tracked through this keyed, one-way digest:
 *
 *   rate_hash = HMAC-SHA256(RATE_LIMIT_HMAC_SECRET, email | date | shift)
 *
 * Because the date and shift are part of the input, the value changes every
 * shift and cannot be correlated across days, and without the server secret it
 * cannot be recomputed from a list of student e-mails.
 */
export function generateRateHash(
  email: string,
  shift: ShiftType,
  date: string,
  secret: string = getRateLimitSecret(),
): string {
  return createHmac("sha256", secret)
    .update(`${email.trim().toLowerCase()}|${date}|${shift}`)
    .digest("hex");
}

const limaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date (`YYYY-MM-DD`) of the dining hall, independent of the server time zone. */
export function getLimaDate(now: Date = new Date()): string {
  return limaDateFormatter.format(now);
}
