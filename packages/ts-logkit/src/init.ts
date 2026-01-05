// src/init.ts
import { setLoggingEnabled } from "./global";

function readEnvFlag(): boolean | undefined {
  // Node
  if (typeof process !== "undefined" && process.env) {
    const v = process.env.TS_LOGKIT_DISABLED;
    if (v === "1" || v === "true") return false;
    if (v === "0" || v === "false") return true;
  }

  // Browser / Next.js client
  if (typeof window !== "undefined") {
    const v = process.env.NEXT_PUBLIC_TS_LOGKIT_DISABLED as string | undefined;
    if (v === "1" || v === "true") return false;
    if (v === "0" || v === "false") return true;
  }

  return undefined;
}

const envValue = readEnvFlag();
if (envValue !== undefined) setLoggingEnabled(envValue);
