"use client";

import type { Event, Formatter, Transport } from "@buchanan-solutions/logkit";

import { eventToLogLine } from "@buchanan-solutions/logkit/ring";

export type CreateHttpLogTransportOptions = {
  ingestUrl: string;
};

/**
 * Fire-and-forget POST of one Event as `{ lines: [LogLine] }`.
 * Fetch failures are swallowed so a down ingest route cannot loop through the logger.
 */
export function createHttpLogTransport(options: CreateHttpLogTransportOptions): Transport {
  const ingestUrl = options.ingestUrl;
  return {
    log(event: Event, _formatter?: Formatter) {
      const line = eventToLogLine(event);
      void fetch(ingestUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: [line] }),
      }).catch(() => {
        /* ingest down — do not log through ts-logkit */
      });
    },
  };
}

export type ClientHttpLogEnv = {
  NODE_ENV?: string | undefined;
  NEXT_PUBLIC_DISABLE_LOG_TELEMETRY?: string | undefined;
};

/**
 * True when the browser should POST kit events into the log ring (development only).
 */
export function isClientHttpLogEnabled(
  env: ClientHttpLogEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_DISABLE_LOG_TELEMETRY: process.env.NEXT_PUBLIC_DISABLE_LOG_TELEMETRY,
  },
): boolean {
  if (env.NODE_ENV !== "development") return false;
  const raw = env.NEXT_PUBLIC_DISABLE_LOG_TELEMETRY;
  return raw !== "true" && raw !== "1";
}
