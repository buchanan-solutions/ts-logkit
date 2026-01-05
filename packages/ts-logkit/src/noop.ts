import { Logger } from "./logger";

export type LoggerLike = Pick<
  Logger,
  "trace" | "debug" | "info" | "warn" | "error" | "fatal"
>;

export const NoopLogger: LoggerLike = {
  trace() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
  fatal() {},
};
