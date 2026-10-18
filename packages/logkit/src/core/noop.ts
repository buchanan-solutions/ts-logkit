// src/core/noop.ts

import type { Config } from "./types/config";
import type { LoggerLike } from "./types/loggerLike";

export const NoopLogger: LoggerLike = {
  trace() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
  fatal() {},
  child(_childId: string, _opts?: Partial<Config>): LoggerLike {
    return NoopLogger;
  },
};
