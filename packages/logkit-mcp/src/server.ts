import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLogControlClient } from "@buchanan-solutions/logkit/client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type LogMcpConfig, resolveLogMcpConfig } from "./config.ts";
import { registerLogDebugTools } from "./tools.ts";

const INSTRUCTIONS = `Log debug MCP (stdio → LOG_DEBUG_URL).

Workflow: debug_health → debug_loggers_list → debug_loggers_set_level → reproduce → debug_log_get_tail → debug_loggers_unset_level.

Requires the target process running with debug log allowed (local dev / test). Product must publish DEBUG_PORT or equivalent mapped to LOG_DEBUG_URL.

Launch: docs/mcp.md and packages/log/README.md.`;

function packageVersion(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  try {
    const pkg = JSON.parse(readFileSync(path.join(here, "../package.json"), "utf8")) as {
      version?: string;
    };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** @dne - shared log debug MCP stays in @buchanan-solutions/logkit/ring
 * reason: one stdio process serves every DEBUG_PORT; LOG_DEBUG_URL selects the service.
 * reason: do not colocate a copy under each app, and do not split a second package.
 */
export function createLogMcpServer(config: LogMcpConfig): McpServer {
  const label = config.label ? ` (${config.label})` : "";
  const server = new McpServer(
    { name: "buchanan-solutions-logkit-mcp", version: packageVersion() },
    {
      instructions: `${INSTRUCTIONS}${label ? `\nTarget label:${label}` : ""}`,
    },
  );
  const client = createLogControlClient({ base: config.debugBaseUrl });
  registerLogDebugTools(server, client);
  return server;
}

export function loadLogMcpConfig(env: NodeJS.ProcessEnv = process.env): LogMcpConfig {
  return resolveLogMcpConfig(env);
}
