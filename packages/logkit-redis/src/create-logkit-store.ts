import { InMemoryStore, type Store } from "@buchanan-solutions/logkit";
import { createClient, type RedisClientType } from "redis";

import { RedisStore } from "./redis-store.ts";

export type CreateLogkitStoreOptions = {
  /** App name — Redis key becomes `${app}:log:levels`. */
  app: string;
  /** Redis URL; when unset/empty, skips Redis and returns InMemoryStore. */
  url?: string;
  /** PING attempts before falling back (default 5). */
  retries?: number;
  /** Delay between PING attempts in ms (default 200). */
  retryMs?: number;
};

export type CreateLogkitStoreResult = {
  store: Store;
  /** True only when Redis connected and PING succeeded. */
  redisAlive: boolean;
};

/**
 * Sleeps `ms` milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Quietly closes a Redis client (boot-probe cleanup).
 */
async function quietClose(client: RedisClientType): Promise<void> {
  try {
    await client.close();
  } catch {
    /* ignore */
  }
}

/**
 * Connects a Redis client and PING-retries; disconnects on failure.
 * Uses a short connect timeout so unreachable hosts fail fast (no hang).
 */
async function connectAndPing(
  url: string,
  retries: number,
  retryMs: number,
): Promise<RedisClientType | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = createClient({
      url,
      socket: {
        connectTimeout: 500,
        reconnectStrategy: false,
      },
    }) as RedisClientType;
    client.on("error", () => {
      // Suppress unhandled error events during boot probes; caller logs once.
    });

    try {
      await client.connect();
      const pong = await client.ping();
      if (pong === "PONG" || pong === "pong") {
        return client;
      }
      await quietClose(client);
    } catch {
      await quietClose(client);
    }

    if (attempt < retries) {
      await sleep(retryMs);
    }
  }

  return null;
}

/**
 * Picks a ts-logkit Store for server boot: Redis HASH when `url` is reachable,
 * otherwise in-memory. Never opens Redis when `url` is unset/empty.
 */
export async function createLogkitStore(
  opts: CreateLogkitStoreOptions,
): Promise<CreateLogkitStoreResult> {
  const url = opts.url?.trim();
  if (!url) {
    return { store: new InMemoryStore(), redisAlive: false };
  }

  const retries = opts.retries ?? 5;
  const retryMs = opts.retryMs ?? 200;
  const client = await connectAndPing(url, retries, retryMs);
  if (!client) {
    console.warn(
      `[logkit-redis] Redis unreachable for app=${opts.app} after ${retries} attempt(s); using InMemoryStore`,
    );
    return { store: new InMemoryStore(), redisAlive: false };
  }

  return { store: new RedisStore(client, opts.app), redisAlive: true };
}
