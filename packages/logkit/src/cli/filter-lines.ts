/**
 * Case-insensitive substring over each line's JSON.
 * Used when the server tail payload has no `q` field (the query was ignored).
 */
export function filterLogLines(lines: unknown[], q: string | undefined): unknown[] {
  const needle = q?.trim().toLowerCase();
  if (needle == null || needle === "") return lines;
  return lines.filter((line) => JSON.stringify(line).toLowerCase().includes(needle));
}
