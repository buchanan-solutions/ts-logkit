// ./tests/01_core/001_hello.test.ts
import { describe, expect, it } from "vitest";

describe("hello", () => {
  it("should say hello world", () => {
    console.log("hello world");
    expect(true).toBe(true);
  });
});
