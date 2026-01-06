import { promises as fs } from "fs";
import path from "path";
import { LoggerStoreConfig, Store, SystemConfig } from "../types/store";

export interface FileSystemStoreOptions {
  /** Path to the JSON file where logger configs are stored */
  filePath: string;
  /** Optional default permissions for the file if created */
  mode?: number; // e.g., 0o600
}

/**
 * FileSystemStore
 *
 * A Node.js file-system-based implementation of a logger config store.
 * Stores `LoggerStoreConfig` objects in a JSON file on disk, with automatic
 * file creation and in-memory caching for efficiency.
 *
 * Features:
 * - Automatic JSON file creation if it doesn't exist
 * - Optional file permissions
 * - In-memory caching to reduce disk reads
 * - Full CRUD methods (`list`, `get`, `set`, `setAll`)
 *
 * Example usage:
 * ```ts
 * import { FileSystemStore } from './FileSystemStore';
 *
 * const store = new FileSystemStore({ filePath: './loggers.json' });
 *
 * // Save a logger config
 * await store.set({ id: 'MyLogger', level: 'debug' });
 *
 * // Retrieve it
 * const config = await store.get('MyLogger');
 * console.log(config.level); // 'debug'
 *
 * // List all loggers
 * const all = await store.list();
 *
 * // Replace all logger configs
 * await store.setAll([
 *   { id: 'LoggerA', level: 'info' },
 *   { id: 'LoggerB', level: 'warn' },
 * ]);
 * ```
 */
export class FileSystemStore implements Store {
  private filePath: string;
  private mode: number;
  private cache: Map<string, LoggerStoreConfig> = new Map();

  constructor(options: FileSystemStoreOptions) {
    this.filePath = options.filePath;
    this.mode = options.mode ?? 0o600; // default to owner read/write
  }

  /** Ensure the file exists and is readable/writable */
  private async ensureFile(): Promise<void> {
    try {
      await fs.access(this.filePath);
    } catch {
      // File doesn't exist — create directory and empty file
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(this.filePath, "[]", { mode: this.mode });
    }
  }

  /** Load the file into memory cache */
  private async loadCache(): Promise<void> {
    await this.ensureFile();
    const data = await fs.readFile(this.filePath, "utf-8");
    try {
      const parsed: SystemConfig = JSON.parse(data);
      this.cache = new Map(parsed.map((c) => [c.id, c]));
    } catch {
      // If file is corrupted, reset
      this.cache = new Map();
      await fs.writeFile(this.filePath, "[]", { mode: this.mode });
    }
  }

  /** Persist current cache to disk */
  private async saveCache(): Promise<void> {
    const data: SystemConfig = Array.from(this.cache.values());
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), {
      mode: this.mode,
    });
  }

  async list(): Promise<SystemConfig> {
    await this.loadCache();
    return Array.from(this.cache.values());
  }

  async setAll(configs: SystemConfig): Promise<void> {
    await this.loadCache();
    this.cache.clear();
    for (const c of configs) {
      this.cache.set(c.id, c);
    }
    await this.saveCache();
  }

  async get(id: string): Promise<LoggerStoreConfig> {
    await this.loadCache();
    const config = this.cache.get(id);
    if (!config) throw new Error(`Logger ${id} not found`);
    return config;
  }

  async set(config: LoggerStoreConfig): Promise<void> {
    await this.loadCache();
    this.cache.set(config.id, config);
    await this.saveCache();
  }
}
