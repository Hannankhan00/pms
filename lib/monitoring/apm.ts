import { logger } from "../logging/logger";

export interface AppmSpan {
  name: string;
  startTime: number;
  tags?: Record<string, string | number | boolean>;
}

/**
 * Lightweight Application Performance Monitoring (APM) and Error Tracking bridge.
 * Formats metrics and exceptions for ingestion by Datadog, Sentry, or Grafana Loki.
 */
export class ApmClient {
  private static instance: ApmClient;

  private constructor() {}

  static getInstance(): ApmClient {
    if (!ApmClient.instance) {
      ApmClient.instance = new ApmClient();
    }
    return ApmClient.instance;
  }

  startSpan(name: string, tags?: Record<string, string | number | boolean>): AppmSpan {
    return {
      name,
      startTime: performance.now(),
      tags,
    };
  }

  endSpan(span: AppmSpan, extraTags?: Record<string, string | number | boolean>) {
    const durationMs = performance.now() - span.startTime;
    const combinedTags = { ...span.tags, ...extraTags };

    if (durationMs > 500) {
      logger.warn(`APM Latency Warning: Operation '${span.name}' exceeded 500ms threshold`, {
        operation: span.name,
        durationMs: Math.round(durationMs * 100) / 100,
        ...combinedTags,
      });
    }

    return durationMs;
  }

  captureException(error: unknown, context?: Record<string, unknown>) {
    const err = error instanceof Error ? error : new Error(String(error));

    logger.error(`APM Captured Exception: ${err.message}`, err, {
      stack: err.stack,
      ...context,
    });

    // If Sentry / Datadog is initialized via environment:
    if (typeof (globalThis as any).Sentry?.captureException === "function") {
      (globalThis as any).Sentry.captureException(err, { extra: context });
    }
  }
}

export const apm = ApmClient.getInstance();
