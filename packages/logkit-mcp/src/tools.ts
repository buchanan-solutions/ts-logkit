import type { LogControlClient } from "@buchanan-solutions/logkit/client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MCP_TOOL_MUTATING, MCP_TOOL_READ_ONLY } from "./annotations.ts";

const LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

async function run(action: () => Promise<unknown>) {
  try {
    return textResult(await action());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: message }],
      isError: true as const,
    };
  }
}

export function registerLogDebugTools(server: McpServer, client: LogControlClient): void {
  server.registerTool(
    "debug_health",
    {
      annotations: { ...MCP_TOOL_READ_ONLY },
      description:
        "GET /health on the debug listener (LOG_DEBUG_URL). Confirms the log debug HTTP server is up.",
    },
    async () => run(() => client.health()),
  );

  server.registerTool(
    "debug_loggers_list",
    {
      annotations: { ...MCP_TOOL_READ_ONLY },
      description: "List server loggers with configured and effective levels (GET /log/loggers).",
    },
    async () => run(() => client.log.listLoggers()),
  );

  server.registerTool(
    "debug_loggers_get",
    {
      annotations: { ...MCP_TOOL_READ_ONLY },
      description: "Get one logger by id (GET /log/loggers/:id).",
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) => run(() => client.log.getLogger(id)),
  );

  server.registerTool(
    "debug_loggers_set_level",
    {
      annotations: { ...MCP_TOOL_MUTATING },
      description:
        "Pin a logger level (PUT /log/loggers/:id). Reproduce, then debug_log_get_tail, then unset.",
      inputSchema: {
        id: z.string().min(1),
        level: z.enum(LEVELS),
      },
    },
    async ({ id, level }) => run(() => client.log.setLoggerLevel(id, level)),
  );

  server.registerTool(
    "debug_loggers_unset_level",
    {
      annotations: { ...MCP_TOOL_MUTATING },
      description: "Remove a logger level pin (DELETE /log/loggers/:id).",
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) => run(() => client.log.unsetLoggerLevel(id)),
  );

  server.registerTool(
    "debug_log_get_tail",
    {
      annotations: { ...MCP_TOOL_READ_ONLY },
      description: "Tail the in-process log ring (GET /log/tail). Optional n and q filter.",
      inputSchema: {
        n: z.number().int().positive().optional(),
        q: z.string().optional(),
      },
    },
    async ({ n, q }) => run(() => client.log.tail(n, q)),
  );
}
