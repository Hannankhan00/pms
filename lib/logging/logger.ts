type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
  "creditCard",
  "ssn",
]);

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || obj === undefined) return obj;

  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item, depth + 1));
  }

  if (typeof obj === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitizedObj[key] = "[REDACTED]";
      } else {
        sanitizedObj[key] = sanitize(value, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return String(obj);
}

class Logger {
  private format(level: LogLevel, payload: LogPayload) {
    const timestamp = new Date().toISOString();
    const sanitizedContext = payload.context ? sanitize(payload.context) : undefined;

    return {
      timestamp,
      level,
      message: payload.message,
      ...(sanitizedContext ? { context: sanitizedContext } : {}),
      ...(payload.error instanceof Error
        ? { errorName: payload.error.name, errorMessage: payload.error.message }
        : {}),
    };
  }

  info(message: string, context?: Record<string, unknown>) {
    console.log(JSON.stringify(this.format("info", { message, context })));
  }

  warn(message: string, context?: Record<string, unknown>) {
    console.warn(JSON.stringify(this.format("warn", { message, context })));
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    console.error(JSON.stringify(this.format("error", { message, error, context })));
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      console.debug(JSON.stringify(this.format("debug", { message, context })));
    }
  }
}

export const logger = new Logger();
