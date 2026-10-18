import { describe, expect, it } from "vitest";

import { filterLogLines } from "./filter-lines";
import { resolveBaseUrl } from "./resolve-base-url";

describe("resolveBaseUrl", () => {
  it("defaults to localhost 6060", () => {
    expect(resolveBaseUrl({ env: {} })).toBe("http://127.0.0.1:6060");
  });

  it("prefers --port over LOG_PORT and LOG_URL", () => {
    expect(
      resolveBaseUrl({
        portFlag: "6065",
        env: { LOG_PORT: "6066", LOG_URL: "http://eos:6060" },
      }),
    ).toBe("http://eos:6065");
  });

  it("preserves LOG_URL mount path when overriding port", () => {
    expect(
      resolveBaseUrl({
        portFlag: "6065",
        env: { LOG_URL: "http://127.0.0.1:6060/api/logging" },
      }),
    ).toBe("http://127.0.0.1:6065/api/logging");
  });

  it("uses LOG_PORT on 127.0.0.1 when LOG_URL is unset", () => {
    expect(resolveBaseUrl({ env: { LOG_PORT: "6067" } })).toBe("http://127.0.0.1:6067");
  });

  it("uses LOG_URL when no port override is set", () => {
    expect(resolveBaseUrl({ env: { LOG_URL: "http://127.0.0.1:6066/" } })).toBe(
      "http://127.0.0.1:6066",
    );
  });

  it("rejects a bad port", () => {
    expect(() => resolveBaseUrl({ portFlag: "nope" })).toThrow(/port must be an integer/);
  });
});

describe("filterLogLines", () => {
  it("keeps lines whose JSON contains the needle", () => {
    const lines = [{ msg: "Hello" }, { msg: "other" }];
    expect(filterLogLines(lines, "hello")).toEqual([{ msg: "Hello" }]);
  });
});
