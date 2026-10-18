import { Event } from "./event";

/**
 * Hook for a logger
 * @interface LogHook
 * @description This is the hook object for a logger. It is used to hook into the logger and perform side effects when a log event is emitted.
 * @property {Event} event - The event to hook into
 */
export interface Hook {
  onLog(event: Event): void | Promise<void>;
}
