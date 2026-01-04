/**
 * Checks if the code is running in a browser environment
 * @returns {boolean} True if running in a browser environment, false otherwise
 */
export function isClient(): boolean {
  return typeof window !== "undefined";
}
