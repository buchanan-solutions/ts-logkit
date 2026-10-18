import { describe, expect, it } from "vitest";

import { resolveLogMcpConfig } from "./config.ts";

describe("resolveLogMcpConfig", () => {
  it("requires LOG_DEBUG_URL", () => {
    expect(() => resolveLogMcpConfig({})).toThrow(/LOG_DEBUG_URL/);
  });

  it("strips trailing slashes and passes optional label", () => {
    expect(
      resolveLogMcpConfig({
        LOG_DEBUG_URL: "http://127.0.0.1:6060/",
        LOG_MCP_LABEL: "ops-api",
      }),
    ).toEqual({
      debugBaseUrl: "http://127.0.0.1:6060",
      label: "ops-api",
    });
  });

  it("preserves mount path segments on LOG_DEBUG_URL", () => {
    expect(
      resolveLogMcpConfig({
        LOG_DEBUG_URL: "http://127.0.0.1:6060/api/t-log/",
      }),
    ).toEqual({
      debugBaseUrl: "http://127.0.0.1:6060/api/t-log",
      label: undefined,
    });
  });
});
