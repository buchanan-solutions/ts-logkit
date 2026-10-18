import { describe, expect, it } from "vitest";

import { createRingBufferTransport, eventToLogLine, RingBuffer } from "./ring-buffer";

describe("RingBuffer", () => {
  it("drops oldest when over capacity", () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4);
    expect(buf.size).toBe(3);
    expect(buf.tail(10)).toEqual([2, 3, 4]);
  });

  it("tail returns newest n oldest-first", () => {
    const buf = new RingBuffer<number>(5);
    for (let i = 1; i <= 5; i++) buf.push(i);
    expect(buf.tail(2)).toEqual([4, 5]);
    expect(buf.tail(0)).toEqual([]);
  });
});

describe("eventToLogLine", () => {
  it("copies structured fields and JSON-safe args", () => {
    const err = new Error("boom");
    expect(
      eventToLogLine({
        logger_id: "eos.api",
        level: "debug",
        message: "ok",
        timestamp: 42,
        args: [{ id: "a" }],
        error: err,
      }),
    ).toEqual({
      ts: 42,
      logger_id: "eos.api",
      level: "debug",
      message: "ok",
      args: [{ id: "a" }],
      error: { name: err.name, message: err.message, stack: err.stack },
    });
  });
});

describe("createRingBufferTransport", () => {
  it("records structured lines without using formatter", () => {
    const { transport, buffer } = createRingBufferTransport({ capacity: 10 });
    transport.log(
      {
        logger_id: "ops-api.http",
        level: "info",
        message: "GET /version → 200",
        timestamp: 1_700_000_000_000,
      },
      {
        format: () => ["should-not-appear"],
      },
    );
    expect(buffer.tail(1)).toEqual([
      {
        ts: 1_700_000_000_000,
        logger_id: "ops-api.http",
        level: "info",
        message: "GET /version → 200",
      },
    ]);
  });
});
