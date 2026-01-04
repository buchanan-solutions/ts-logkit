import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node", // or 'jsdom' for browser-like environments
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/vitest.setup.ts"],
  },
});

