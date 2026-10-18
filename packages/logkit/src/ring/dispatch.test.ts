import { describe, expect, it } from "vitest";
import { Registry } from "../index";

import { handleNextLogControlSlug, handleNextLogIngestRequest } from "./dispatch.ts";
import { createRingBufferTransport } from "./ring-buffer.ts";

describe("handleNextLogControlSlug", () => {
  const { buffer: logRing } = createRingBufferTransport({ capacity: 100 });
  const loggerRegistry = new Registry();
  const deps = {
    loggerRegistry,
    logRing,
    isAllowed: () => true,
  };

  it("returns 404 when slug does not start with log", async () => {
    const result = await handleNextLogControlSlug(
      {
        method: "GET",
        slug: ["tail"],
        searchParams: new URLSearchParams(),
        jsonBody: async () => ({}),
      },
      deps,
    );
    expect(result.status).toBe(404);
  });

  it("returns 404 for POST", async () => {
    const result = await handleNextLogControlSlug(
      {
        method: "POST",
        slug: ["log"],
        searchParams: new URLSearchParams(),
        jsonBody: async () => ({}),
      },
      deps,
    );
    expect(result.status).toBe(404);
  });

  it("tails when slug is log/tail", async () => {
    const result = await handleNextLogControlSlug(
      {
        method: "GET",
        slug: ["log", "tail"],
        searchParams: new URLSearchParams(),
        jsonBody: async () => ({}),
      },
      deps,
    );
    expect(result.status).toBe(200);
  });
});

describe("handleNextLogIngestRequest", () => {
  it("ingests client lines", async () => {
    const { buffer: logRing } = createRingBufferTransport({ capacity: 100 });
    const result = await handleNextLogIngestRequest(
      {
        jsonBody: async () => ({
          lines: [
            {
              ts: Date.now(),
              logger_id: "ui",
              level: "warn",
              message: "from test",
            },
          ],
        }),
      },
      {
        loggerRegistry: new Registry(),
        logRing,
        isAllowed: () => true,
      },
    );
    expect(result.status).toBe(200);
  });
});
