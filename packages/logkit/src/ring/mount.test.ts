import { describe, expect, it } from "vitest";

import {
  joinDebugSuffix,
  normalizeDebugBase,
  normalizeMount,
  pathnameUnderMount,
} from "./mount.ts";

describe("normalizeMount", () => {
  it("accepts root and nested mounts with trailing slashes", () => {
    expect(normalizeMount("/")).toBe("/");
    expect(normalizeMount("api/logging/")).toBe("/api/logging");
    expect(normalizeMount("/api/t-log")).toBe("/api/t-log");
  });
});

describe("normalizeDebugBase", () => {
  it("preserves nested path segments on absolute URLs", () => {
    expect(normalizeDebugBase("http://127.0.0.1:6060/api/logging/")).toBe(
      "http://127.0.0.1:6060/api/logging",
    );
    expect(normalizeDebugBase("http://127.0.0.1:6060/")).toBe("http://127.0.0.1:6060");
  });

  it("normalizes relative bases", () => {
    expect(normalizeDebugBase("/api/debug/")).toBe("/api/debug");
  });
});

describe("pathnameUnderMount", () => {
  it("maps nested mounts and trailing slashes", () => {
    expect(pathnameUnderMount("/api/logging/tail", "/api/logging")).toBe("/tail");
    expect(pathnameUnderMount("/api/logging/", "/api/logging")).toBe("/");
    expect(pathnameUnderMount("/tail", "/")).toBe("/tail");
  });

  it("rejects paths outside the mount and prefix lookalikes", () => {
    expect(pathnameUnderMount("/api/logging-other/tail", "/api/logging")).toBeNull();
    expect(pathnameUnderMount("/other/tail", "/api/logging")).toBeNull();
    expect(pathnameUnderMount("/health", "/api/logging")).toBeNull();
  });
});

describe("joinDebugSuffix", () => {
  it("appends suffixes without dropping mount segments", () => {
    expect(joinDebugSuffix("http://127.0.0.1:8080/api/t-log", "/health")).toBe(
      "http://127.0.0.1:8080/api/t-log/health",
    );
    expect(joinDebugSuffix("/api/debug", "tail")).toBe("/api/debug/tail");
    expect(joinDebugSuffix("http://127.0.0.1:6060", "/loggers")).toBe(
      "http://127.0.0.1:6060/loggers",
    );
  });
});
