import { type Level } from "./level";
import { type Transport } from "./transport";
import { type Hook } from "./hook";
import { type Formatter } from "./formatter";
import type { LoggerFactory } from "../factory";
import type { Logger } from "../logger";

/**
 * Configuration for a logger
 * @interface Config
 * @property {string} id - The id of the logger
 * @property {Transport[]} transports - The transports to use for logging
 * @property {Formatter} formatter - The formatter to use for formatting log events
 * @property {Hook[]} [hooks] - Hooks to call when a log event is emitted
 * @property {Level} [level] - Explicit configured severity; omit for NOTSET (inherit)
 * @property {Level} [fallbackLevel] - Process fallback when the whole chain is NOTSET
 * @property {Logger} [parent] - Parent logger for no-registry pointer walk
 * @property {string} [type] - The type of the logger (Component, Service, etc.)
 */
export interface Config {
  id: string;
  transports: Transport[];
  formatter: Formatter;
  hooks?: Hook[];
  /** Explicit pin. Omit → configured NOTSET (inherit). */
  level?: Level;
  /** Used when configured chain is all NOTSET and no factory default is available. */
  fallbackLevel?: Level;
  /** Set by `child()` when no registry — pointer walk for effective level. */
  parent?: Logger;
  type?: string;
  factory?: LoggerFactory;
}

export interface ConfigOverride extends Partial<Config> {}
