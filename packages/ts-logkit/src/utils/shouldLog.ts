import { Level } from "../types/level";
import { LEVELS } from "../types/level";

/**
 * Checks if a log level should be logged based on a minimum level threshold
 * @param level - The log level to check
 * @param minLevel - The minimum level threshold
 * @returns true if the level should be logged (level >= minLevel), false otherwise
 * @example
 * ```typescript
 * shouldLog("debug", "info"); // false - debug is below info
 * shouldLog("warn", "info"); // true - warn is at or above info
 * shouldLog("error", "warn"); // true - error is at or above warn
 * ```
 */
export function shouldLog(level: Level, minLevel: Level): boolean {
  const levelIndex = LEVELS.indexOf(level);
  const minLevelIndex = LEVELS.indexOf(minLevel);
  return levelIndex >= minLevelIndex;
}
