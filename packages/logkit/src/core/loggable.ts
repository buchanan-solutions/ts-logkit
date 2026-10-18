import { LoggerLike } from "./types/loggerLike";
import { NoopLogger } from "./noop";

/**
 * A class that can be logged.
 * 
 * @example
 * ```typescript
 * class MyClass extends Loggable {
 *   constructor(logger?: LoggerLike) {
 *     super(logger);
 *   }
 * }
 * ```
 * 
 */
export abstract class Loggable {
  protected static _classLogger: LoggerLike = NoopLogger;
  
  static setLogger(logger: LoggerLike) {
    this._classLogger = logger;
  }

  protected readonly _logger?: LoggerLike;

  protected constructor(logger?: LoggerLike) {
    this._logger = logger;
  }
  
  protected get log(): LoggerLike {
    const ctor = this.constructor as typeof Loggable;
    return this._logger ?? ctor._classLogger ?? NoopLogger;
  }
}