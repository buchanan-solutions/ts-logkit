import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/** MCP tool annotations for a read-only, idempotent tool (GET-like / pure query). */
export const MCP_TOOL_READ_ONLY = {
  readOnlyHint: true,
  idempotentHint: true,
} as const satisfies ToolAnnotations;

/** MCP tool annotations for a mutating / non-idempotent tool. */
export const MCP_TOOL_MUTATING = {
  readOnlyHint: false,
  idempotentHint: false,
} as const satisfies ToolAnnotations;
