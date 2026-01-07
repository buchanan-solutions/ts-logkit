import { Registry } from "../registry/registry";
import { Level } from "./types/level";
import { validateLevelAndWarn } from "./utils/validateLevel";

export class Global {
  private static _enabled = true;
  private static _level: Level = "trace";

  /** Enable / disable logging globally */
  static get enabled(): boolean {
    return Global._enabled;
  }

  static set enabled(value: boolean) {
    Global._enabled = value;
  }

  /** Global minimum log level */
  static get level(): Level {
    return Global._level;
  }

  static set level(value: Level) {
    validateLevelAndWarn(value, {
      qualifier: "Global.level",
      onSuccess: () => {
        Global._level = value;
      },
      onFailure: () => {
        return;
      },
    });
  }
}

/** Control ts-logkit internal diagnostic logging */
export function setInternalLogLevel(level: Level) {
  validateLevelAndWarn(level, {
    qualifier: "src/global.ts:setAllClassLoggingToLevel",
    onSuccess: () => {
      Registry.logLevel = level;
    },
    onFailure: () => {
      return;
    },
  });
}
