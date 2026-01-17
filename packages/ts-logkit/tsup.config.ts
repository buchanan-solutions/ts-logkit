// ./packages/ts-logkit/tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/registry/index.ts",
    "src/stores/index.ts",
    "src/stores/server.ts",
    "src/testing/index.ts",
    "src/testing/vitest/index.ts"
  ],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["vitest"]
});
