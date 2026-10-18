import { InMemoryStore } from "@buchanan-solutions/logkit";
import { describe, expect, it } from "vitest";

import { createLogkitStore } from "./create-logkit-store";

describe("createLogkitStore", () => {
  it("returns InMemoryStore immediately when url is unset", async () => {
    const result = await createLogkitStore({ app: "licensing" });
    expect(result.redisAlive).toBe(false);
    expect(result.store).toBeInstanceOf(InMemoryStore);
  });

  it("returns InMemoryStore immediately when url is empty/whitespace", async () => {
    const result = await createLogkitStore({ app: "licensing", url: "   " });
    expect(result.redisAlive).toBe(false);
    expect(result.store).toBeInstanceOf(InMemoryStore);
  });

  it("falls back to InMemoryStore when Redis is unreachable", async () => {
    const result = await createLogkitStore({
      app: "licensing",
      url: "redis://127.0.0.1:1",
      retries: 1,
      retryMs: 10,
    });
    expect(result.redisAlive).toBe(false);
    expect(result.store).toBeInstanceOf(InMemoryStore);
  }, 10_000);
});
