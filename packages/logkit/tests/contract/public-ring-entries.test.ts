import { createRequire } from "node:module";
import { buildSync } from "esbuild";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("built ring entry points", () => {
  it("bundles ring helpers for browsers without Node builtins", () => {
    const result = buildSync({
      stdin: {
        contents:
          'import { eventToLogLine, RingBuffer } from "@buchanan-solutions/logkit/ring"; export { eventToLogLine, RingBuffer };',
        resolveDir: process.cwd(),
      },
      bundle: true,
      platform: "browser",
      format: "esm",
      write: false,
    });
    expect(result.outputFiles).toHaveLength(1);
  });

  it("exposes the listener through the Node entry in ESM and CommonJS", async () => {
    const nodeEntry = await import("@buchanan-solutions/logkit/ring/node");
    const commonJsEntry = require("@buchanan-solutions/logkit/ring/node");
    expect(typeof nodeEntry.ensureDebugHttpServer).toBe("function");
    expect(typeof commonJsEntry.ensureDebugHttpServer).toBe("function");
    const sharedEntry = await import("@buchanan-solutions/logkit/ring");
    expect("ensureDebugHttpServer" in sharedEntry).toBe(false);
  });
});
