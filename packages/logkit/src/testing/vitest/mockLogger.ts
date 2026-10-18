// ./src/testing/vitest/mockLogger.ts

import { vi } from "vitest";
import type { LoggerLike } from "../../core/types/loggerLike";
import { createSpyableLogger } from "../mockLogger";

export function createVitestSpyableLogger(): LoggerLike {
  const spyLogger = createSpyableLogger();

  // wrap all methods you want in vi.fn()
  spyLogger.trace = vi.fn(spyLogger.trace);
  spyLogger.debug = vi.fn(spyLogger.debug);
  spyLogger.info = vi.fn(spyLogger.info);
  spyLogger.warn = vi.fn(spyLogger.warn);
  spyLogger.error = vi.fn(spyLogger.error);
  spyLogger.fatal = vi.fn(spyLogger.fatal);

  return spyLogger;
}
