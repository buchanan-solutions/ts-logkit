/**
 * Error thrown when a logger is not found in the registry.
 * Includes a statusCode property (404) for easy HTTP error mapping.
 */
export class LoggerNotFoundError extends Error {
  public readonly statusCode: number = 404;
  public readonly code: string = "LOGGER_NOT_FOUND";

  constructor(loggerId: string) {
    super(`Logger "${loggerId}" not found in registry`);
    this.name = "LoggerNotFoundError";
  }
}
