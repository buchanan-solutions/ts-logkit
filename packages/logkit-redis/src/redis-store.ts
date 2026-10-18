import {
  LEVELS,
  type Level,
  type LoggerStoreConfig,
  type Store,
  type SystemConfig,
} from "@buchanan-solutions/logkit";

/**
 * Minimal Redis HASH surface used by {@link RedisStore}.
 * Narrow so unit tests can fake it without a live Redis.
 */
export type RedisHashClient = {
  hGetAll(key: string): Promise<Record<string, string>>;
  hGet(key: string, field: string): Promise<string | undefined | null>;
  hSet(key: string, field: string, value: string): Promise<unknown>;
  hDel(key: string, field: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

/**
 * True when `raw` is a ts-logkit Level string.
 */
function isLevel(raw: string): raw is Level {
  return (LEVELS as readonly string[]).includes(raw);
}

/**
 * Builds a Redis HASH key for one app's logger pins.
 */
export function levelsHashKey(app: string): string {
  return `${app}:log:levels`;
}

/**
 * ts-logkit {@link Store} backed by a Redis HASH at `${app}:log:levels`.
 * Field = logger id, value = level. Registry still caches in memory after bootstrap.
 */
export class RedisStore implements Store {
  private readonly key: string;

  constructor(
    private readonly client: RedisHashClient,
    app: string,
  ) {
    if (!app.trim()) {
      throw new Error("RedisStore app must be a non-empty string");
    }
    this.key = levelsHashKey(app);
  }

  /**
   * Lists all pinned logger configs from the HASH.
   */
  async list(): Promise<SystemConfig> {
    const all = await this.client.hGetAll(this.key);
    const out: SystemConfig = [];
    for (const [id, level] of Object.entries(all)) {
      if (isLevel(level)) {
        out.push({ id, level });
      }
    }
    return out;
  }

  /**
   * Replaces the full HASH with `configs` (delete key, then set fields).
   */
  async setAll(configs: SystemConfig): Promise<void> {
    await this.client.del(this.key);
    for (const c of configs) {
      if (c.level != null && isLevel(c.level)) {
        await this.client.hSet(this.key, c.id, c.level);
      }
    }
  }

  /**
   * Returns one logger config or throws if the field is missing / invalid.
   */
  async get(id: string): Promise<LoggerStoreConfig> {
    const level = await this.client.hGet(this.key, id);
    if (level == null || level === "" || !isLevel(level)) {
      throw new Error(`Logger ${id} not found`);
    }
    return { id, level };
  }

  /**
   * Upserts one logger pin into the HASH.
   */
  async set(config: LoggerStoreConfig): Promise<void> {
    if (config.level == null || !isLevel(config.level)) {
      throw new Error(`invalid level for logger ${config.id}`);
    }
    await this.client.hSet(this.key, config.id, config.level);
  }

  /**
   * Removes one pin so the id inherits again.
   */
  async delete(id: string): Promise<void> {
    await this.client.hDel(this.key, id);
  }
}
