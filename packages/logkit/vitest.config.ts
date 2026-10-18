import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    maxWorkers: 2,
    minWorkers: 1,
    environment: "node", // or 'jsdom' for browser-like environments
    globals: true,
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    setupFiles: ["./tests/vitest.setup.ts"],
  },
});
