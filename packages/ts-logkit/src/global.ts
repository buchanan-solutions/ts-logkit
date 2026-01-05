import { Level } from "./types";

let enabled = true;

/**
 * Global minimum log level defaults to 'trace' to ensure all logs are emitted.
 *
 * This can be overridden by the user via `setLogLevel`.
 */
let level: Level = "trace";

/**
 * Global logging configuration class with static methods
 * for controlling logging behavior across all logger instances.
 */
class Global {
  /**
   * Disable or enable logging globally (runtime)
   */
  static setLoggingEnabled(value: boolean): void {
    enabled = value;
  }

  /**
   * Check if logging is currently enabled globally
   */
  static isLoggingEnabled(): boolean {
    return enabled;
  }

  /**
   * Set the global minimum log level
   */
  static setLogLevel(value: Level): void {
    level = value;
  }

  /**
   * Get the current global minimum log level
   */
  static getLogLevel(): Level {
    return level;
  }
}

export default Global;
