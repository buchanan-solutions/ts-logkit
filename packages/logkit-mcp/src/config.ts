export type LogMcpConfig = {
  debugBaseUrl: string;
  label: string | undefined;
};

import { normalizeDebugBase } from "@buchanan-solutions/logkit/ring";

/**
 * Requires `LOG_DEBUG_URL` (complete origin + mount). No default port.
 */
export function resolveLogMcpConfig(env: NodeJS.ProcessEnv = process.env): LogMcpConfig {
  const raw = env.LOG_DEBUG_URL?.trim();
  if (!raw) {
    throw new Error("LOG_DEBUG_URL is required (e.g. http://127.0.0.1:6060/api/logging)");
  }
  const label = env.LOG_MCP_LABEL?.trim();
  return {
    debugBaseUrl: normalizeDebugBase(raw),
    label: label && label.length > 0 ? label : undefined,
  };
}
