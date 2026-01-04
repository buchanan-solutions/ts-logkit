import { Level } from "./level";

/**
 * Event object for a log
 *
 * @description This is the event object for a log. It is used to store the log event data and is used by the transport to log the event.
 *
 * @interface Event
 * @property {Level} level - The level of the event
 * @property {string} message - The message of the event
 * @property {number} timestamp - The timestamp of the event
 * @property {Record<string, unknown>} [context] - The context of the event
 * @property {Error} [error] - The error of the event
 */
export interface Event {
  level: Level;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  error?: Error;
}
