/**
 * Buzón de Sugerencias - Comedor UNSCH
 * Centralized Structured Logger & Defensive Anonymity / Anti-Leak Layer
 * (Ley N.° 29733 de Protección de Datos Personales & OTI UNSCH SRE Baseline)
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  details?: unknown;
  error?: {
    name?: string;
    message: string;
    code?: string | number;
    stack?: string;
  };
}

/**
 * Institutional and general email regular expressions.
 * Anonymizes any student or user institutional email address.
 */
const INSTITUTIONAL_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@unsch\.edu\.pe\b/gi;
const GENERAL_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi;

/** Database connection URI regex with credentials (handles passwords containing special characters) */
const DB_CREDENTIALS_REGEX = /(postgres(?:ql)?:\/\/)[^\s/]+@(?=[a-zA-Z0-9_.-]+(?::\d+)?(?:\/|$|\?|#))/gi;

/** JWT format: header.payload.signature */
const JWT_REGEX = /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g;

/** HMAC / SHA-256 64-hexadecimal character hashes */
const HEX64_HASH_REGEX = /\b[a-fA-F0-9]{64}\b/g;

/** Bearer authorization tokens */
const BEARER_TOKEN_REGEX = /Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi;

/** Sensitive key-value pair parameters in query strings or configs */
const SENSITIVE_KV_REGEX = /\b(password|secret|token|credential|api_key|private_key)=[^&\s]+/gi;

/**
 * Known sensitive environment variable values to redact if found in log strings.
 */
function getKnownEnvSecrets(): string[] {
  const secrets: string[] = [];
  if (typeof process === "undefined" || !process.env) return secrets;

  const candidateKeys = [
    "NEXTAUTH_SECRET",
    "RATE_LIMIT_HMAC_SECRET",
    "GOOGLE_CLIENT_SECRET",
    "POSTGRES_PASSWORD",
    "DATABASE_URL",
  ];

  for (const key of candidateKeys) {
    const val = process.env[key];
    if (val && typeof val === "string" && val.length >= 8) {
      secrets.push(val);
    }
  }

  return secrets;
}

/**
 * Masks sensitive strings: institutional emails, database credentials,
 * JWT tokens, HMAC hashes, Bearer tokens, and known environment secrets.
 */
export function maskSensitiveData(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  let sanitized = input;

  // 1. Redact known environment secret values
  const knownSecrets = getKnownEnvSecrets();
  for (const secret of knownSecrets) {
    if (sanitized.includes(secret)) {
      sanitized = sanitized.split(secret).join("[REDACTED_SECRET]");
    }
  }

  // 2. Database credentials in connection URIs
  sanitized = sanitized.replace(DB_CREDENTIALS_REGEX, "$1***@");

  // 3. JWT tokens
  sanitized = sanitized.replace(JWT_REGEX, "[REDACTED_JWT]");

  // 4. Bearer tokens
  sanitized = sanitized.replace(BEARER_TOKEN_REGEX, "Bearer [REDACTED]");

  // 5. Sensitive key-value parameters
  sanitized = sanitized.replace(SENSITIVE_KV_REGEX, "$1=[REDACTED]");

  // 6. HMAC SHA-256 64-character rate limit hashes
  sanitized = sanitized.replace(HEX64_HASH_REGEX, "[REDACTED_HASH]");

  // 7. Defensive Anonymity Filter: Institutional emails (@unsch.edu.pe) and general emails
  sanitized = sanitized.replace(INSTITUTIONAL_EMAIL_REGEX, "***@unsch.edu.pe");
  sanitized = sanitized.replace(GENERAL_EMAIL_REGEX, "***@***");

  return sanitized;
}

/** Sensitive object property keys to redact recursively */
const SENSITIVE_OBJECT_KEYS = new Set([
  "password",
  "secret",
  "token",
  "jwt",
  "accesstoken",
  "refreshtoken",
  "credential",
  "credentials",
  "authorization",
  "rate_hash",
  "ratehash",
  "nextauth_secret",
  "rate_limit_hmac_secret",
  "google_client_secret",
  "postgres_password",
]);

/**
 * Recursively sanitizes any payload data, masking strings and redacting sensitive object keys.
 */
export function sanitizeLogData(data: unknown, depth = 0): unknown {
  if (depth > 5) return "[DEPTH_LIMIT_REACHED]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return maskSensitiveData(data);
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_OBJECT_KEYS.has(lowerKey)) {
        sanitizedObj[key] = "[REDACTED]";
      } else {
        sanitizedObj[key] = sanitizeLogData(value, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return String(data);
}

/**
 * Formats a LogEntry into standard single-line JSON with all sensitive data masked.
 */
export function formatLogEntry(entry: LogEntry): string {
  const sanitizedEntry: LogEntry = {
    timestamp: entry.timestamp,
    level: entry.level,
    context: maskSensitiveData(entry.context),
    message: maskSensitiveData(entry.message),
  };

  if (entry.details !== undefined) {
    sanitizedEntry.details = sanitizeLogData(entry.details);
  }

  if (entry.error !== undefined) {
    sanitizedEntry.error = {
      name: entry.error.name ? maskSensitiveData(entry.error.name) : undefined,
      message: maskSensitiveData(entry.error.message),
      code: entry.error.code,
      stack: entry.error.stack ? maskSensitiveData(entry.error.stack) : undefined,
    };
  }

  return JSON.stringify(sanitizedEntry);
}

/**
 * Dispatches a log entry to the appropriate console stream.
 */
function dispatchLog(level: LogLevel, line: string): void {
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

/**
 * Centralized Structured Logger for OTI UNSCH operations.
 */
export const logger = {
  info(context: string, message: string, details?: unknown): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      context,
      message,
      details,
    };
    dispatchLog("info", formatLogEntry(entry));
    return entry;
  },

  warn(context: string, message: string, details?: unknown): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "warn",
      context,
      message,
      details,
    };
    dispatchLog("warn", formatLogEntry(entry));
    return entry;
  },

  error(context: string, message: string, error?: unknown, details?: unknown): LogEntry {
    let errorObj: LogEntry["error"];

    if (error instanceof Error) {
      errorObj = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as { code?: string | number }).code,
      };
    } else if (error) {
      errorObj = {
        message: String(error),
      };
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "error",
      context,
      message,
      details,
      error: errorObj,
    };
    dispatchLog("error", formatLogEntry(entry));
    return entry;
  },
};
