import { describe, expect, it } from "vitest";

import { levelsHashKey, type RedisHashClient, RedisStore } from "./redis-store";

/**
 * In-memory fake of the Redis HASH ops used by RedisStore.
 */
function createFakeHash(): RedisHashClient & { data: Map<string, Map<string, string>> } {
  const data = new Map<string, Map<string, string>>();

  return {
    data,
    async hGetAll(key) {
      const hash = data.get(key);
      if (!hash) return {};
      return Object.fromEntries(hash.entries());
    },
    async hGet(key, field) {
      return data.get(key)?.get(field) ?? null;
    },
    async hSet(key, field, value) {
      let hash = data.get(key);
      if (!hash) {
        hash = new Map();
        data.set(key, hash);
      }
      hash.set(field, value);
      return 1;
    },
    async hDel(key, field) {
      return data.get(key)?.delete(field) ? 1 : 0;
    },
    async del(key) {
      return data.delete(key) ? 1 : 0;
    },
  };
}

describe("levelsHashKey", () => {
  it("uses app:log:levels", () => {
    expect(levelsHashKey("licensing")).toBe("licensing:log:levels");
  });
});

describe("RedisStore", () => {
  it("set/get/list/delete round-trip on HASH", async () => {
    const fake = createFakeHash();
    const store = new RedisStore(fake, "licensing");

    await store.set({ id: "licensing", level: "debug" });
    await store.set({ id: "licensing.http", level: "warn" });

    expect(await store.get("licensing")).toEqual({ id: "licensing", level: "debug" });
    const listed = await store.list();
    expect(listed).toEqual(
      expect.arrayContaining([
        { id: "licensing", level: "debug" },
        { id: "licensing.http", level: "warn" },
      ]),
    );
    expect(listed).toHaveLength(2);

    await store.delete("licensing.http");
    await expect(store.get("licensing.http")).rejects.toThrow(/not found/);
    expect(await store.list()).toEqual([{ id: "licensing", level: "debug" }]);
  });

  it("setAll replaces the HASH", async () => {
    const fake = createFakeHash();
    const store = new RedisStore(fake, "ops-api");
    await store.set({ id: "a", level: "info" });
    await store.setAll([{ id: "b", level: "error" }]);
    expect(await store.list()).toEqual([{ id: "b", level: "error" }]);
  });

  it("rejects empty app", () => {
    expect(() => new RedisStore(createFakeHash(), "  ")).toThrow(/non-empty/);
  });
});
