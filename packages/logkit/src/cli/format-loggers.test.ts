import { describe, expect, it } from "vitest";

import { formatLoggerTable, type LoggerRow, sortLoggerRows } from "./format-loggers";

const rows: LoggerRow[] = [
  { id: "eos.http", configured: "NOTSET", effective: "info" },
  { id: "eos", configured: "info", effective: "info" },
];

describe("sortLoggerRows", () => {
  it("sorts ids ascending so children stack under a parent", () => {
    expect(sortLoggerRows(rows, "asc").map((row) => row.id)).toEqual(["eos", "eos.http"]);
  });

  it("sorts ids descending", () => {
    expect(sortLoggerRows(rows, "desc").map((row) => row.id)).toEqual(["eos.http", "eos"]);
  });
});

describe("formatLoggerTable", () => {
  it("prints one padded row per logger", () => {
    const text = formatLoggerTable(sortLoggerRows(rows, "asc"));
    expect(text).toBe(
      "id        configured  effective\neos       info        info\neos.http  NOTSET      info\n",
    );
  });
});
