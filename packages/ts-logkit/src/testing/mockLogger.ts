// ./packages/ts-logkit/src/testing/mockLogger.ts
import type { LoggerLike } from "../core/types/loggerLike";

export function createSpyableLogger(): LoggerLike {
  const calls: Record<string, unknown[][]> = {};

  const logger: LoggerLike = {
    trace: (...args) => { calls.trace = calls.trace ?? []; calls.trace.push(args); },
    debug: (...args) => { calls.debug = calls.debug ?? []; calls.debug.push(args); },
    info: (...args) => { calls.info = calls.info ?? []; calls.info.push(args); },
    warn: (...args) => { calls.warn = calls.warn ?? []; calls.warn.push(args); },
    error: (...args) => { calls.error = calls.error ?? []; calls.error.push(args); },
    fatal: (...args) => { calls.fatal = calls.fatal ?? []; calls.fatal.push(args); },
    child: (_id) => logger,
  };

  return logger;
}
