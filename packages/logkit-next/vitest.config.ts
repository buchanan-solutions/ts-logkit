import { defineConfig } from "vitest/config";

export default defineConfig({ test: { environment: "node", maxWorkers: 2, minWorkers: 1 } });
