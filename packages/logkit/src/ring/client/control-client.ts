import { joinDebugSuffix, normalizeDebugBase } from "../mount.ts";

export type CreateLogControlClientOptions = {
  /** Complete mount URL: origin plus mount path (e.g. `http://127.0.0.1:6060/api/logging`). */
  base: string;
};

export type LogControlClient = {
  health: () => Promise<unknown>;
  log: {
    tail: (n?: number, q?: string) => Promise<unknown>;
    listLoggers: () => Promise<unknown>;
    getLogger: (id: string) => Promise<unknown>;
    setLoggerLevel: (id: string, level: string) => Promise<unknown>;
    unsetLoggerLevel: (id: string) => Promise<unknown>;
  };
};

/**
 * Fetch client for `{base}/tail`, `{base}/loggers`, etc. (`base` is the full mount URL).
 */
export function createLogControlClient(options: CreateLogControlClientOptions): LogControlClient {
  const base = normalizeDebugBase(options.base);

  async function parseResponse(path: string, res: Response): Promise<unknown> {
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* keep raw text */
    }
    if (!res.ok) {
      throw new Error(
        `log control ${path} failed: ${res.status} ${typeof body === "string" ? body : JSON.stringify(body)}`,
      );
    }
    return body;
  }

  async function get(suffix: string): Promise<unknown> {
    const url = joinDebugSuffix(base, suffix);
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    return parseResponse(url, res);
  }

  async function put(suffix: string, body: unknown): Promise<unknown> {
    const url = joinDebugSuffix(base, suffix);
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return parseResponse(url, res);
  }

  async function del(suffix: string): Promise<unknown> {
    const url = joinDebugSuffix(base, suffix);
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    return parseResponse(url, res);
  }

  return {
    health: () => get("/health"),
    log: {
      listLoggers: () => get("/loggers"),
      getLogger: (id) => get(`/loggers/${encodeURIComponent(id)}`),
      setLoggerLevel: (id, level) => put(`/loggers/${encodeURIComponent(id)}`, { level }),
      unsetLoggerLevel: (id) => del(`/loggers/${encodeURIComponent(id)}`),
      tail: (n, q) => {
        const params = new URLSearchParams();
        if (n != null && Number.isFinite(n)) {
          params.set("n", String(Math.floor(n)));
        }
        const needle = q?.trim();
        if (needle) params.set("q", needle);
        const qs = params.toString() ? `?${params.toString()}` : "";
        return get(`/tail${qs}`);
      },
    },
  };
}
