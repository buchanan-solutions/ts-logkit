export type LogMcpConfig = {
  debugBaseUrl: string;
  label: string | undefined;
};

/**
 * Requires `LOG_DEBUG_URL` (debug listener origin). No default port.
 */
export function resolveLogMcpConfig(env: NodeJS.ProcessEnv = process.env): LogMcpConfig {
  const raw = env.LOG_DEBUG_URL?.trim();
  if (!raw) {
    throw new Error("LOG_DEBUG_URL is required (e.g. http://127.0.0.1:6060)");
  }
  const label = env.LOG_MCP_LABEL?.trim();
  return {
    debugBaseUrl: raw.replace(/\/+$/, ""),
    label: label && label.length > 0 ? label : undefined,
  };
}
