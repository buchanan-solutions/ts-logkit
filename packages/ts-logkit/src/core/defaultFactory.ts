import type { LoggerFactory } from "./factory";
import type { ConfigOverride } from "./types/config";
import type { LoggerLike } from "./types/loggerLike";

let _defaultFactory: LoggerFactory | undefined;

/**
 * Pins the process-wide factory used by top-level `getLogger`.
 * Call once at boot after `createLoggerFactory` (+ registry bootstrap).
 * Pass `undefined` to clear.
 */
export function setDefaultFactory(factory: LoggerFactory | undefined): void {
  _defaultFactory = factory;
}

/**
 * Returns the current default factory, if any.
 * Useful for tests and diagnostics — prefer `getLogger` at call sites.
 */
export function getDefaultFactory(): LoggerFactory | undefined {
  return _defaultFactory;
}

/**
 * Python-shaped entry: logger by dotted id via the default factory.
 * Throws if `setDefaultFactory` was never called (or was cleared).
 */
export function getLogger(
  id: string,
  opts?: ConfigOverride
): LoggerLike {
  if (!_defaultFactory) {
    throw new Error(
      "ts-logkit: no default factory. Call setDefaultFactory(factory) after createLoggerFactory at boot."
    );
  }
  return _defaultFactory.getLogger(id, opts);
}
