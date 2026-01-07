import { Level, LEVELS } from "../types";

/**
 * Validates if a given level is a valid log level.
 * @param level - The level to validate
 * @returns true if the level is valid, false otherwise
 */
export function validateLevel(level: Level): boolean {
  return LEVELS.includes(level);
}

/**
 * Options for validateLevelAndWarn function
 */
export interface ValidateLevelOptions {
  /** Whether to warn on validation failure (default: true) */
  warn?: boolean;
  /** Context string for warning messages (default: "validateLevelAndWarn") */
  qualifier?: string;
  /** Optional callback to execute on successful validation */
  onSuccess?: () => void;
  /** Optional callback to execute on validation failure */
  onFailure?: () => void;
}

/**
 * Validates a log level and optionally warns on failure, with success/failure callbacks.
 * Supports named parameters via an options object for clarity.
 * @param level - The level to validate
 * @param options - Options object with warn, qualifier, onSuccess, and onFailure
 * @returns true if validation succeeded, false otherwise
 */
export function validateLevelAndWarn(
  level: Level,
  options: ValidateLevelOptions = {}
): boolean {
  const {
    warn = true,
    qualifier = "validateLevelAndWarn",
    onSuccess,
    onFailure,
  } = options;

  const isValid = validateLevel(level);

  if (!isValid) {
    if (warn) {
      console.warn(
        `[ts-logkit] Invalid log level in ${qualifier}("${level}"), ignoring.`
      );
    }
    if (onFailure) {
      void onFailure();
    }
    return false;
  }

  if (onSuccess) {
    void onSuccess();
  }
  return true;
}
