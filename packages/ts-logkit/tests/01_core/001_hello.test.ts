// ./packages/ts-logkit/tests/01_core/001_hello.test.ts
import { describe, it, expect } from "vitest";

describe("hello", () => {
  it("should say hello world", () => {
    console.log("hello world");
    expect(true).toBe(true);
  });
});
