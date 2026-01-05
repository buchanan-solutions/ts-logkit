import { Level } from "./level";
import { Transport } from "./transport";
import { Hook } from "./hook";
import { Formatter } from "./formatter";

/**
 * Configuration for a logger
 * @interface Config
 * @property {string} id - The id of the logger
 * @property {Transport[]} transports - The transports to use for logging
 * @property {Formatter} formatter - The formatter to use for formatting log events
 * @property {Hook[]} [hooks] - Hooks to call when a log event is emitted
 * @property {Level} [level] - The minimum level of events to log
 * @property {string} [type] - The type of the logger (Component, Service, etc.) - useful for filtering logs in a framework
 */
export interface Config {
  id: string;
  transports: Transport[];
  formatter: Formatter;
  hooks?: Hook[];
  level?: Level;
  type?: string;
}
