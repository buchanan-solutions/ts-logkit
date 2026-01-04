export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEvent {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  error?: Error;
}

export interface LogTransport {
  log(event: LogEvent): void;
}

export interface LogHook {
  onLog(event: LogEvent): void | Promise<void>;
}
