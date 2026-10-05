/** Strips credentials from anything that looks like a connection string. */
export function sanitizeDbMessage(message: string): string {
  return message.replace(/(postgres(?:ql)?:\/\/)[^@\s/]*@/gi, "$1***@");
}

/**
 * Known internal patterns that must NEVER leak to students or untrusted clients.
 */
const SENSITIVE_PATTERNS = [
  /relation\s+["']?[a-zA-Z0-9_.]*["']?/gi,
  /column\s+["']?[a-zA-Z0-9_.]*["']?/gi,
  /table\s+["']?[a-zA-Z0-9_.]*["']?/gi,
  /constraint\s+["']?[a-zA-Z0-9_.]*["']?/gi,
  /\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|UNION|CREATE|DROP|ALTER|TRUNCATE)\b/gi,
  /\/(?:app|var|etc|home|usr|root|[a-zA-Z0-9_.-]+)\/[a-zA-Z0-9_/.-]*/g,
  /[a-zA-Z]:\\[a-zA-Z0-9_\\\.-]*/g,
  /at\s+(?:.*)\((?:.*):\d+:\d+\)/g,
  /node_modules/g,
  /public\.(?:suggestions|submission_rate_limits|ticket_responses|admins|daily_menus|menu_ratings)/g,
];

export interface SafeErrorResponse {
  safeMessage: string;
  statusCode: number;
}

/**
 * Determines whether an error originates from the database layer, driver,
 * or contains internal sensitive information (table names, columns, file paths, SQL).
 */
export function isDatabaseOrInternalError(error: unknown): boolean {
  if (!error) return false;

  const errObj = error as Record<string, unknown>;

  // PostgreSQL driver error codes (e.g., "42P01", "23505", "08006", "42703")
  if (typeof errObj.code === "string" && /^[0-9A-Z]{5}$/.test(errObj.code)) {
    return true;
  }

  const rawMessage = error instanceof Error ? error.message : String(error);

  return (
    /postgres|pglite|query|transaction|rollback|connection|pool|syntax error/i.test(rawMessage) ||
    SENSITIVE_PATTERNS.some((pattern) => pattern.test(rawMessage))
  );
}

/**
 * Centralized exception handler for database and infrastructure errors.
 * Logs sanitized details on the server while returning an opaque, safe message to the client.
 */
export function sanitizeDatabaseError(
  error: unknown,
  fallbackMessage = "Ocurrió un problema al procesar la solicitud en el servidor. Por favor, intenta de nuevo en unos momentos.",
): SafeErrorResponse {
  if (!error) {
    return {
      safeMessage: fallbackMessage,
      statusCode: 500,
    };
  }

  const rawMessage = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;

  // Log on the server with credentials and connection strings sanitized
  console.error(
    `[db-security] Intercepted internal error [${code ?? "NONE"}]:`,
    sanitizeDbMessage(rawMessage),
  );

  // Safe client response: never leak internal schema, tables, columns or paths
  return {
    safeMessage: fallbackMessage,
    statusCode: 500,
  };
}
