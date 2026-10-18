import { Command, Option } from "commander";
import packageJson from "../../package.json";

import { filterLogLines } from "./filter-lines.ts";
import { asLoggerRows, formatLoggerTable, sortLoggerRows } from "./format-loggers.ts";
import { resolveBaseUrl } from "./resolve-base-url.ts";

const CLI_VERSION = packageJson.version;

type TailBody = {
  n?: number;
  q?: string;
  capacity?: number;
  size?: number;
  lines?: unknown[];
};

/**
 * Calls the private debug listener and returns parsed JSON.
 */
async function requestJson(url: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`log request failed (${url}): ${message}`);
  }
  const text = await res.text();
  let body: unknown = text;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const error =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : text || res.statusText;
    throw new Error(`${res.status} ${error} (${url})`);
  }
  return body;
}

/**
 * Prints a JSON value for humans reading a terminal.
 */
function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Commander program: `log` against the private `/log` listener.
 */
function buildProgram(): Command {
  const program = new Command();
  program
    .name("log")
    .description("Talk to a service private log listener (loggers and tail).")
    .version(CLI_VERSION, "-v, --version", "print the log CLI version")
    .addOption(
      new Option("--port <port>", "debug listener port (default 6060, or LOG_PORT)").argParser(
        (value) => value,
      ),
    )
    .hook("preAction", () => {
      const opts = program.opts<{ port?: string }>();
      program.setOptionValue(
        "baseUrl",
        resolveBaseUrl(opts.port != null ? { portFlag: opts.port } : {}),
      );
    });

  const loggers = program.command("loggers").description("List and pin logger levels");

  loggers
    .command("list")
    .description("List logger ids with configured and effective levels")
    .option("--table", "print id, configured, and effective as plain columns (grep one row)")
    .addOption(
      new Option("--sort <direction>", "sort logger ids alphabetically").choices(["asc", "desc"]),
    )
    .action(async (opts: { table?: boolean; sort?: "asc" | "desc" }) => {
      const baseUrl = program.opts<{ baseUrl: string }>().baseUrl;
      let rows = asLoggerRows(await requestJson(`${baseUrl}/log/loggers`));
      if (opts.sort) rows = sortLoggerRows(rows, opts.sort);
      if (opts.table) {
        process.stdout.write(formatLoggerTable(rows));
        return;
      }
      printJson(rows);
    });

  loggers
    .command("get")
    .description("Show one logger")
    .argument("<id>", "logger id")
    .action(async (id: string) => {
      const baseUrl = program.opts<{ baseUrl: string }>().baseUrl;
      printJson(await requestJson(`${baseUrl}/log/loggers/${encodeURIComponent(id)}`));
    });

  loggers
    .command("set")
    .description("Pin a logger level")
    .argument("<id>", "logger id")
    .argument("<level>", "kit level name (debug, info, warn, error, …)")
    .action(async (id: string, level: string) => {
      const baseUrl = program.opts<{ baseUrl: string }>().baseUrl;
      printJson(
        await requestJson(`${baseUrl}/log/loggers/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ level }),
        }),
      );
    });

  loggers
    .command("unset")
    .description("Clear a logger pin (back to NOTSET / inherited)")
    .argument("<id>", "logger id")
    .action(async (id: string) => {
      const baseUrl = program.opts<{ baseUrl: string }>().baseUrl;
      printJson(
        await requestJson(`${baseUrl}/log/loggers/${encodeURIComponent(id)}`, {
          method: "DELETE",
        }),
      );
    });

  program
    .command("tail")
    .description("Print the newest lines from the in-process ring")
    .option("-n, --lines <n>", "how many newest lines to request", "100")
    .option("-q, --query <text>", "case-insensitive substring over each line JSON")
    .action(async (opts: { lines: string; query?: string }) => {
      const baseUrl = program.opts<{ baseUrl: string }>().baseUrl;
      const params = new URLSearchParams({ n: opts.lines });
      if (opts.query) params.set("q", opts.query);
      const body = (await requestJson(`${baseUrl}/log/tail?${params}`)) as TailBody;
      if (opts.query && (body == null || typeof body !== "object" || !("q" in body))) {
        const lines = Array.isArray(body?.lines) ? body.lines : [];
        printJson({ ...body, q: opts.query, lines: filterLogLines(lines, opts.query) });
        return;
      }
      printJson(body);
    });

  return program;
}

const argv = process.argv.slice(0, 2);
const rest = process.argv.slice(2);
// pnpm forwards a literal `--` into the script (`pnpm log -- --port 6065`).
// Root `pnpm log` adds another `--` before the filter script, so more than one can arrive.
while (rest[0] === "--") rest.shift();
buildProgram()
  .parseAsync([...argv, ...rest])
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });

export { buildProgram };
