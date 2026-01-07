import { Event } from "./event";

/**
 * Formatted output can be:
 * - A string (for Node.js/ANSI)
 * - An array starting with format string and style (for browser %c)
 */
export type FormattedOutput = string | [string, ...unknown[]];

/**
 * Formatter for a logger
 * @interface Formatter
 * @description This is the formatter object for a logger. It is used to format log events into a displayable format.
 */
export interface Formatter {
  format(event: Event): FormattedOutput;
}
