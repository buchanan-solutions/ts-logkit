import type { Event, Formatter, Level, Transport } from "../index";

/** One structured line held for agent-readable `GET /log/tail`. */
export type LogLine = {
  ts: number;
  logger_id: string;
  level: Level;
  message: string;
  args?: unknown[];
  error?: { name: string; message: string; stack?: string };
};

const DEFAULT_CAPACITY = 1000;

/**
 * Fixed-capacity ring: push overwrites the oldest when full (O(1), bounded memory).
 */
export class RingBuffer<T> {
  private readonly buf: (T | undefined)[];
  private write = 0;
  private filled = 0;

  constructor(readonly capacity: number) {
    if (capacity < 1) throw new Error("ring capacity must be >= 1");
    this.buf = new Array(capacity);
  }

  /**
   * Appends an item; drops the oldest once at capacity.
   */
  push(item: T): void {
    this.buf[this.write] = item;
    this.write = (this.write + 1) % this.capacity;
    if (this.filled < this.capacity) this.filled++;
  }

  /**
   * Returns up to `n` newest items, oldest→newest.
   */
  tail(n: number): T[] {
    const count = Math.min(Math.max(0, n), this.filled);
    if (count === 0) return [];
    const out: T[] = new Array(count);
    const start = (this.write - count + this.capacity) % this.capacity;
    for (let i = 0; i < count; i++) {
      out[i] = this.buf[(start + i) % this.capacity] as T;
    }
    return out;
  }

  get size(): number {
    return this.filled;
  }
}

/**
 * JSON-ish projection of Event.args (skip non-serializable junk).
 */
export function serializeArgs(args: unknown[] | undefined): unknown[] | undefined {
  if (args == null || args.length === 0) return undefined;
  try {
    return JSON.parse(JSON.stringify(args)) as unknown[];
  } catch {
    return args.map((a) => {
      try {
        return JSON.parse(JSON.stringify(a));
      } catch {
        return String(a);
      }
    });
  }
}

/**
 * Maps a ts-logkit Event onto a ring {@link LogLine} (JSON-safe args).
 * Shared so HTTP ingest / client transports stamp the same fields as the in-process ring.
 */
export function eventToLogLine(event: Event): LogLine {
  const line: LogLine = {
    ts: event.timestamp,
    logger_id: event.logger_id,
    level: event.level,
    message: event.message,
  };
  const args = serializeArgs(event.args);
  if (args) line.args = args;
  if (event.error) {
    line.error = {
      name: event.error.name,
      message: event.error.message,
      ...(event.error.stack != null ? { stack: event.error.stack } : {}),
    };
  }
  return line;
}

/**
 * Builds a kit Transport that records emits into a fixed ring (ignores formatter).
 */
export function createRingBufferTransport(options?: { capacity?: number }): {
  transport: Transport;
  buffer: RingBuffer<LogLine>;
} {
  const capacity = options?.capacity ?? DEFAULT_CAPACITY;
  const buffer = new RingBuffer<LogLine>(capacity);
  const transport: Transport = {
    log(event: Event, _formatter?: Formatter) {
      buffer.push(eventToLogLine(event));
    },
  };
  return { transport, buffer };
}
