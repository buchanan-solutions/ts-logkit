import {
  createConsoleTransport,
  createLoggerFactory,
  defaultFormatter,
  LEVELS,
  type Level,
  type LoggerLike,
  Registry,
  setDefaultFactory,
} from "@buchanan-solutions/logkit";
import {
  createRingBufferTransport,
  type LogLine,
  type RingBuffer,
} from "@buchanan-solutions/logkit/ring";
import { createOtelTransport } from "@buchanan-solutions/logkit-otel";
import { createLogkitStore } from "@buchanan-solutions/logkit-redis";

export type CreateServiceLoggerOptions = {
  /** Root logger id and Redis app key (e.g. `ops-api`, `licensing`). */
  app: string;
  /** Env var for ring capacity (e.g. `OPS_LOG_CAPACITY`). */
  logCapacityEnv: string;
  /** Default OTEL / log service name when `OTEL_SERVICE_NAME` unset. */
  serviceName?: string;
  /** Default ring capacity when env unset. */
  defaultLogCapacity?: number;
};

export type ServiceLoggerBundle = {
  rootLevel: Level;
  loggerRegistry: Registry;
  redisAlive: boolean;
  loggerStorage: "redis" | "memory";
  logRing: RingBuffer<LogLine>;
  rootLog: LoggerLike;
};

function resolveRootLevel(): Level {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return (LEVELS as readonly string[]).includes(raw) ? (raw as Level) : "info";
}

function resolveLogCapacity(envKey: string, fallback: number): number {
  const raw = Number(process.env[envKey] ?? fallback);
  if (!Number.isFinite(raw) || raw < 1) return fallback;
  return Math.min(Math.floor(raw), 10_000);
}

/**
 * Builds registry + root logger + log ring + optional Redis pins + OTEL log transport.
 */
export async function createServiceLogger(
  options: CreateServiceLoggerOptions,
): Promise<ServiceLoggerBundle> {
  const rootLevel = resolveRootLevel();
  const loggerRegistry = new Registry();
  const serviceName = options.serviceName ?? options.app;
  const defaultCapacity = options.defaultLogCapacity ?? 1000;

  const redisUrl = process.env.REDIS_URL;
  const { store, redisAlive: redisStoreAlive } = await createLogkitStore({
    app: options.app,
    ...(redisUrl != null && redisUrl !== "" ? { url: redisUrl } : {}),
  });

  const redisAlive = redisStoreAlive;
  const loggerStorage: "redis" | "memory" = redisAlive ? "redis" : "memory";

  await loggerRegistry.bootstrap(store);

  const { transport: ringTransport, buffer: logBuffer } = createRingBufferTransport({
    capacity: resolveLogCapacity(options.logCapacityEnv, defaultCapacity),
  });

  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const deploymentEnvironment = process.env.ENVIRONMENT;
  const otelTransport = createOtelTransport({
    serviceName: process.env.OTEL_SERVICE_NAME ?? serviceName,
    ...(otelEndpoint != null && otelEndpoint !== "" ? { endpoint: otelEndpoint } : {}),
    ...(deploymentEnvironment != null && deploymentEnvironment !== ""
      ? { deploymentEnvironment }
      : {}),
  });

  const loggerFactory = createLoggerFactory({
    transports: [createConsoleTransport(), ringTransport, otelTransport],
    formatter: defaultFormatter,
    level: rootLevel,
    registry: loggerRegistry,
  });

  setDefaultFactory(loggerFactory);

  const rootLog: LoggerLike = loggerFactory.createLogger(options.app, {
    level: rootLevel,
  });

  if (loggerRegistry.lookupConfigured(options.app) == null) {
    loggerRegistry.update(options.app, rootLevel);
  }

  rootLog.info("logger store ready", {
    redisAlive,
    store: loggerStorage,
    rootConfigured: loggerRegistry.lookupConfigured(options.app),
  });

  return {
    rootLevel,
    loggerRegistry,
    redisAlive,
    loggerStorage,
    logRing: logBuffer,
    rootLog,
  };
}
