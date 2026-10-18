import type { Logger } from "../logger";
import type { Config } from "./config";

export type LoggerLike = Pick<Logger, "trace" | "debug" | "info" | "warn" | "error" | "fatal"> & {
  child(childId: string, opts?: Partial<Config>): LoggerLike;
};
