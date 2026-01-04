// tests/vitest.setup.ts
/// <reference types="vitest" />

import { beforeEach } from "vitest";

// Only run this in jsdom environment
if (typeof window !== "undefined") {
    // Set a "native browser" URL for relative fetches
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost:8080"),
      writable: true,
    });
  
    // Optional: clear cookies before each test
    beforeEach(() => {
      document.cookie = "";
    });
  
    console.log("[vitest.setup.ts] window.location set to", window.location.href);
  }
  