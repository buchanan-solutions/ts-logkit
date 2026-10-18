import {
  createConsoleTransport,
  createLoggerFactory,
  defaultFormatter,
  InMemoryStore,
  LEVELS,
  type Level,
  type LoggerFactory,
  type LoggerLike,
  Registry,
  setDefaultFactory,
} from "@buchanan-solutions/logkit";
import { createOtelTransport } from "@buchanan-solutions/logkit-otel";

import { ensureDebugHttpServer } from "@buchanan-solutions/logkit/ring";
import { createRingBufferTransport, type LogLine, type RingBuffer } from "@buchanan-solutions/logkit/ring";

export type RegisterNextServerLoggingOptions = {
  app: string;
  logCapacityEnv?: string;
  /** globalThis key for idempotent debug server + logging boot (tests). */
  globalKey?: string;
  serviceName?: string;
  defaultLogCapacity?: number;
  /** The private debug listener's port; `DEBUG_PORT`, else 6060, when not said. */
  debugPort?: number;
};

export type RegisterNextServerLoggingResult = {
  rootLog: LoggerLike;
  loggerFactory: LoggerFactory;
  loggerRegistry: Registry;
  logRing: RingBuffer<LogLine>;
  /** Resolves after registry pins can be read/written via the store. */
  bootstrapPromise: Promise<void>;
};

type GlobalNextLoggingState = RegisterNextServerLoggingResult;

type GlobalWithNextLogging = typeof globalThis & {
  [key: string]: GlobalNextLoggingState | undefined;
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

function defaultCapacityEnv(app: string): string {
  const slug = app.trim().replace(/-/g, "_").toUpperCase();
  return `${slug}_LOG_CAPACITY`;
}

export function defaultNextServerLoggingGlobalKey(app: string): string {
  return `__coreMfgNextServerLogging_${app}`;
}

export type GetNextServerLoggingStateOptions = {
  app: string;
  globalKey?: string;
};

/**
 * Returns boot state from `registerNextServerLogging`, or undefined if not registered.
 */
export function getNextServerLoggingState(
  options: GetNextServerLoggingStateOptions,
): RegisterNextServerLoggingResult | undefined {
  const globalKey = options.globalKey ?? defaultNextServerLoggingGlobalKey(options.app);
  const g = globalThis as GlobalWithNextLogging;
  return g[globalKey];
}

/**
 * Console + ring + OTEL log transports, registry pin, and private DEBUG_PORT listener.
 * Idempotent per `globalKey` (default derived from `app`).
 */
export function registerNextServerLogging(
  options: RegisterNextServerLoggingOptions,
): RegisterNextServerLoggingResult {
  const globalKey = options.globalKey ?? defaultNextServerLoggingGlobalKey(options.app);
  const g = globalThis as GlobalWithNextLogging;
  const existing = g[globalKey];
  if (existing) return existing;

  const rootLevel = resolveRootLevel();
  const loggerRegistry = new Registry();
  const loggerStore = new InMemoryStore();
  const bootstrapPromise = loggerRegistry.bootstrap(loggerStore).then(
    () => {},
    (err: unknown) => {
      console.error(`[${options.app}] logger registry bootstrap failed`, err);
    },
  );
  const serviceName = options.serviceName ?? options.app;
  const capacityEnv = options.logCapacityEnv ?? defaultCapacityEnv(options.app);
  const defaultCapacity = options.defaultLogCapacity ?? 1000;

  const { transport: ringTransport, buffer: logRing } = createRingBufferTransport({
    capacity: resolveLogCapacity(capacityEnv, defaultCapacity),
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

  void bootstrapPromise.then(() => {
    if (loggerRegistry.lookupConfigured(options.app) == null) {
      loggerRegistry.update(options.app, rootLevel);
    }
  });

  ensureDebugHttpServer({
    ...(options.debugPort == null ? {} : { debugPort: options.debugPort }),
    loggerRegistry,
    logRing,
    rootLog,
    globalKey: `${globalKey}_debugHttp`,
    beforeRegistryAccess: () => bootstrapPromise,
  });

  const state: RegisterNextServerLoggingResult = {
    rootLog,
    loggerFactory,
    loggerRegistry,
    logRing,
    bootstrapPromise,
  };
  g[globalKey] = state;
  return state;
}
