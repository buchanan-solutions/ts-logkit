export type LoggerRow = {
  id: string;
  configured: string;
  effective: string;
};

/**
 * Reads the `/log/loggers` payload into rows.
 * The list command sorts and prints these; a non-array body is a server bug.
 */
export function asLoggerRows(body: unknown): LoggerRow[] {
  if (!Array.isArray(body)) {
    throw new Error("loggers list response was not an array");
  }
  return body.map((row) => {
    const record = row as { id?: unknown; configured?: unknown; effective?: unknown };
    return {
      id: String(record.id ?? ""),
      configured: String(record.configured ?? ""),
      effective: String(record.effective ?? ""),
    };
  });
}

/**
 * Alphabetical by logger id so parent and child ids stack (`eos`, then `eos.http`).
 */
export function sortLoggerRows(rows: LoggerRow[], direction: "asc" | "desc"): LoggerRow[] {
  const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  if (direction === "desc") sorted.reverse();
  return sorted;
}

/**
 * Space-separated columns, header included, no borders.
 * Built so `grep` keeps one full row per line.
 */
export function formatLoggerTable(rows: LoggerRow[]): string {
  const header = { id: "id", configured: "configured", effective: "effective" };
  const all = [header, ...rows];
  const idWidth = Math.max(...all.map((row) => row.id.length));
  const configuredWidth = Math.max(...all.map((row) => row.configured.length));
  const lines = all.map(
    (row) =>
      `${row.id.padEnd(idWidth)}  ${row.configured.padEnd(configuredWidth)}  ${row.effective}`,
  );
  return `${lines.join("\n")}\n`;
}
