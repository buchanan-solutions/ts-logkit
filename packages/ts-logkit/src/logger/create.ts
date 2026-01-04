// ./packages/ts-logkit/src/core/createLogger.ts
import { LogEvent, LogLevel, LogHook, LogTransport } from "../types";

interface LoggerOptions {
  level?: LogLevel;
  transport: LogTransport;
  hooks?: LogHook[];
}

const LEVEL_ORDER: LogLevel[] = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
];

export function createLogger(opts: LoggerOptions) {
  const minLevel = opts.level ?? "info";

  function shouldLog(level: LogLevel) {
    return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(minLevel);
  }

  function emit(event: LogEvent) {
    if (!shouldLog(event.level)) return;

    opts.transport.log(event);

    if (opts.hooks) {
      for (const hook of opts.hooks) {
        hook.onLog(event);
      }
    }
  }

  return {
    trace: (msg: string, ctx?: object) =>
      emit({
        level: "trace",
        message: msg,
        context: ctx,
        timestamp: Date.now(),
      }),

    debug: (msg: string, ctx?: object) =>
      emit({
        level: "debug",
        message: msg,
        context: ctx,
        timestamp: Date.now(),
      }),

    info: (msg: string, ctx?: object) =>
      emit({
        level: "info",
        message: msg,
        context: ctx,
        timestamp: Date.now(),
      }),

    warn: (msg: string, ctx?: object) =>
      emit({
        level: "warn",
        message: msg,
        context: ctx,
        timestamp: Date.now(),
      }),

    error: (msg: string, err?: Error, ctx?: object) =>
      emit({
        level: "error",
        message: msg,
        error: err,
        context: ctx,
        timestamp: Date.now(),
      }),

    fatal: (msg: string, err?: Error, ctx?: object) =>
      emit({
        level: "fatal",
        message: msg,
        error: err,
        context: ctx,
        timestamp: Date.now(),
      }),
  };
}
