// src/init.ts
import { Global } from "./global";
import { Level } from "./types";
import { LEVELS } from "./types/level";

function readEnvFlag(): boolean | undefined {
  // Node
  if (typeof process !== "undefined" && process.env) {
    const v = process.env.TS_LOGKIT_DISABLED;
    if (v === "1" || v === "true") return false;
    if (v === "0" || v === "false") return true;
  }

  // Browser / Next.js
  if (typeof window !== "undefined") {
    const v = process.env.NEXT_PUBLIC_TS_LOGKIT_DISABLED as string | undefined;
    if (v === "1" || v === "true") return false;
    if (v === "0" || v === "false") return true;
  }

  return undefined;
}

function readEnvLevel(): Level | undefined {
  const getValue = () => {
    let value: string | undefined;

    if (typeof process !== "undefined" && process.env) {
      value = process.env.TS_LOGKIT_LEVEL;
    }
    if (typeof window !== "undefined") {
      value = process.env.NEXT_PUBLIC_TS_LOGKIT_LEVEL as string | undefined;
    }
    return value;
  };

  const v = getValue();
  if (!v) {
    return undefined;
  }

  if (LEVELS.includes(v as Level)) {
    return v as Level;
  }

  console.warn(`[ts-logkit] Invalid TS_LOGKIT_LEVEL value: "${v}", ignoring.`);
  return undefined;
}

// Apply global toggle
const envEnabled = readEnvFlag();
if (envEnabled !== undefined) Global.enabled = envEnabled;

// Apply global log level
const envLevel = readEnvLevel();
if (envLevel !== undefined) {
  Global.level = envLevel;
}
