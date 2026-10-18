import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createLogMcpServer, loadLogMcpConfig } from "./server.ts";

/** @dne - shared log debug MCP stays in @buchanan-solutions/logkit/ring
 * reason: one stdio process serves every DEBUG_PORT; LOG_DEBUG_URL selects the service.
 * reason: do not colocate a copy under each app, and do not split a second package.
 */
async function main(): Promise<void> {
  const config = loadLogMcpConfig();
  const server = createLogMcpServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const label = config.label ? ` label=${config.label}` : "";
  console.error(`[log-mcp] stdio ready${label} → ${config.debugBaseUrl}`);
}

main().catch((err) => {
  console.error("[log-mcp] fatal:", err);
  process.exit(1);
});
