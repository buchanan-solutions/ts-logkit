import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  Logger,
  createLoggerFactory,
  createConsoleTransport,
  devFormatter,
  Global,
  Registry,
  InMemoryStore,
  setDefaultFactory,
  getLogger,
  type Event,
  type Transport,
} from "../../src/index";

/**
 * Builds a transport that records events for assertions.
 * Exists so tests can assert emit filtering without console noise.
 */
function createCaptureTransport(events: Event[]): Transport {
  return {
    log(event: Event) {
      events.push(event);
    },
  };
}

describe("NOTSET inheritance", () => {
  const events: Event[] = [];

  beforeEach(() => {
    events.length = 0;
    Global.enabled = true;
    Global.level = "trace";
  });

  afterEach(() => {
    setDefaultFactory(undefined);
  });

  it("parent setLevel(debug) → NOTSET child emits debug; parent warn → child quiet", () => {
    const parent = new Logger({
      id: "app",
      transports: [createCaptureTransport(events)],
      formatter: devFormatter,
      level: "info",
    });
    const child = parent.child("feature");

    expect(child.configuredLevel).toBe("notset");
    expect(child.level).toBe("info");

    parent.setLevel("debug");
    child.debug("noisy");
    expect(events).toHaveLength(1);
    expect(events[0]?.message).toBe("noisy");

    events.length = 0;
    parent.setLevel("warn");
    child.debug("quiet");
    expect(events).toHaveLength(0);
  });

  it("explicit child debug survives parent warn; grandchild NOTSET follows child", () => {
    const parent = new Logger({
      id: "app",
      transports: [createCaptureTransport(events)],
      formatter: devFormatter,
      level: "info",
    });
    const child = parent.child("feature", { level: "debug" });
    const grand = child.child("inner");

    parent.setLevel("warn");
    child.debug("still");
    grand.debug("also");
    expect(events.map((e) => e.message)).toEqual(["still", "also"]);
    expect(grand.configuredLevel).toBe("notset");
    expect(grand.level).toBe("debug");
  });

  it("missing intermediate id inherits nearest explicit ancestor", async () => {
    const registry = new Registry();
    const store = new InMemoryStore();
    await registry.bootstrap(store);
    const factory = createLoggerFactory({
      transports: [createCaptureTransport(events)],
      formatter: devFormatter,
      level: "warn",
      registry,
    });

    const a = factory.createLogger("a", { level: "debug" }) as Logger;
    // Never create a.b — only a.c
    const ac = factory.createLogger("a.c") as Logger;

    expect(ac.configuredLevel).toBe("notset");
    expect(ac.getEffectiveLevel()).toBe("debug");
    expect(a.configuredLevel).toBe("debug");

    ac.debug("via-a");
    expect(events).toHaveLength(1);
  });

  it("register child does not add store row", async () => {
    const registry = new Registry();
    const store = new InMemoryStore();
    await registry.bootstrap(store);
    const factory = createLoggerFactory({
      transports: [createConsoleTransport()],
      formatter: devFormatter,
      level: "info",
      registry,
    });

    const root = factory.createLogger("ops-api", { level: "info" }) as Logger;
    root.setLevel("info");
    const child = root.child("http") as Logger;

    expect(child.configuredLevel).toBe("notset");
    const rows = await store.list();
    expect(rows.find((r) => r.id === "ops-api.http")).toBeUndefined();
  });

  it("emit / getEffectiveLevel does not call Store get/list", async () => {
    const registry = new Registry();
    const store = new InMemoryStore();
    await registry.bootstrap(store);

    const listSpy = vi.spyOn(store, "list");
    const getSpy = vi.spyOn(store, "get");

    const factory = createLoggerFactory({
      transports: [createCaptureTransport(events)],
      formatter: devFormatter,
      level: "info",
      registry,
    });

    const root = factory.createLogger("ops-api", { level: "info" }) as Logger;
    const child = root.child("http") as Logger;

    listSpy.mockClear();
    getSpy.mockClear();

    child.getEffectiveLevel();
    child.debug("x");
    child.info("y");

    expect(listSpy).not.toHaveBeenCalled();
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("getLogger === createLogger singleton; default factory path works", async () => {
    const registry = new Registry();
    await registry.bootstrap(new InMemoryStore());
    const factory = createLoggerFactory({
      transports: [createConsoleTransport()],
      formatter: devFormatter,
      level: "info",
      registry,
    });

    const a = factory.createLogger("svc");
    const b = factory.getLogger("svc");
    expect(a).toBe(b);

    setDefaultFactory(factory);
    const c = getLogger("svc");
    expect(c).toBe(a);

    setDefaultFactory(undefined);
    expect(() => getLogger("svc")).toThrow(/no default factory/i);
  });

  it("update / unset live flip without recreate", async () => {
    const registry = new Registry();
    const store = new InMemoryStore();
    await registry.bootstrap(store);
    const factory = createLoggerFactory({
      transports: [createCaptureTransport(events)],
      formatter: devFormatter,
      level: "info",
      registry,
    });

    const root = factory.createLogger("ops-api", { level: "info" }) as Logger;
    const runout = factory.createLogger("ops-api.runout") as Logger;
    const inner = runout.child("estimate") as Logger;

    expect(inner.configuredLevel).toBe("notset");
    expect(inner.level).toBe("info");

    registry.update("ops-api.runout", "debug");
    expect(runout.configuredLevel).toBe("debug");
    expect(inner.getEffectiveLevel()).toBe("debug");
    inner.debug("on");
    expect(events).toHaveLength(1);

    events.length = 0;
    registry.unset("ops-api.runout");
    expect(runout.configuredLevel).toBe("notset");
    expect(inner.getEffectiveLevel()).toBe("info");
    inner.debug("off");
    expect(events).toHaveLength(0);

    // allow async store delete to settle
    await Promise.resolve();
    const rows = await store.list();
    expect(rows.find((r) => r.id === "ops-api.runout")).toBeUndefined();
  });

  it("Global.level still suppresses below the floor", () => {
    const log = new Logger({
      id: "g",
      transports: [createCaptureTransport(events)],
      formatter: devFormatter,
      level: "debug",
    });
    Global.level = "warn";
    log.debug("no");
    log.warn("yes");
    expect(events.map((e) => e.message)).toEqual(["yes"]);
  });

  it("listLevels exposes configured + effective", async () => {
    const registry = new Registry();
    await registry.bootstrap(new InMemoryStore());
    const factory = createLoggerFactory({
      transports: [createConsoleTransport()],
      formatter: devFormatter,
      level: "warn",
      registry,
    });
    factory.createLogger("root", { level: "info" });
    factory.createLogger("root.child");

    const list = registry.listLevels();
    const child = list.find((r) => r.id === "root.child");
    expect(child).toEqual({
      id: "root.child",
      configured: "notset",
      effective: "info",
    });
  });
});
