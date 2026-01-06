import { LoggerLike } from "./types/loggerLike";

export const NoopLogger: LoggerLike = {
  trace() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
  fatal() {},
};
