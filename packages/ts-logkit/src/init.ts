// src/init.ts
import { Global } from "./global";
import { Level } from "./types";
import { validateLevelAndWarn } from "./utils/validateLevel";

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

  let result: Level | undefined;
  validateLevelAndWarn(v as Level, {
    qualifier: "init.ts:readEnvLevel [env: TS_LOGKIT_LEVEL]",
    onSuccess: () => {
      result = v as Level;
    },
    onFailure: () => {
      result = undefined;
    },
  });

  return result;
}

// Apply global toggle
const envEnabled = readEnvFlag();
if (envEnabled !== undefined) Global.enabled = envEnabled;

// Apply global log level
const envLevel = readEnvLevel();
if (envLevel !== undefined) {
  Global.level = envLevel;
}
