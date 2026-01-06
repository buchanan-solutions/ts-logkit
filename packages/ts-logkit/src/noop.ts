import { LoggerLike } from "./types/loggerLike";
import { Config } from "./types/config";

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
