// src/global.ts
let enabled = true;

/**
 * Disable or enable logging globally (runtime)
 */
export function setLoggingEnabled(value: boolean) {
  enabled = value;
}

export function isLoggingEnabled(): boolean {
  return enabled;
}
