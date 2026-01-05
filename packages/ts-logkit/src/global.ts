import { Level, LEVELS } from "./types";

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
    if (!LEVELS.includes(value)) {
      console.warn(
        `[ts-logkit] Invalid log level in Global.level=("${value}"), ignoring.`
      );
      return;
    }
    Global._level = value;
  }
}
