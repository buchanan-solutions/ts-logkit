export type CreateLogControlClientOptions = {
  /** Origin or path prefix before `/log/...` (e.g. `http://127.0.0.1:6060`, `/api/debug`). */
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

function normalizeBase(base: string): string {
  return base.trim().replace(/\/+$/, "");
}

/**
 * Fetch client for `{base}/log/tail`, `{base}/log/loggers`, etc.
 */
export function createLogControlClient(options: CreateLogControlClientOptions): LogControlClient {
  const base = normalizeBase(options.base);

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

  async function get(path: string): Promise<unknown> {
    const res = await fetch(`${base}${path}`, {
      headers: { Accept: "application/json" },
    });
    return parseResponse(path, res);
  }

  async function put(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${base}${path}`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return parseResponse(path, res);
  }

  async function del(path: string): Promise<unknown> {
    const res = await fetch(`${base}${path}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    return parseResponse(path, res);
  }

  return {
    health: () => get("/health"),
    log: {
      listLoggers: () => get("/log/loggers"),
      getLogger: (id) => get(`/log/loggers/${encodeURIComponent(id)}`),
      setLoggerLevel: (id, level) => put(`/log/loggers/${encodeURIComponent(id)}`, { level }),
      unsetLoggerLevel: (id) => del(`/log/loggers/${encodeURIComponent(id)}`),
      tail: (n, q) => {
        const params = new URLSearchParams();
        if (n != null && Number.isFinite(n)) {
          params.set("n", String(Math.floor(n)));
        }
        const needle = q?.trim();
        if (needle) params.set("q", needle);
        const qs = params.toString() ? `?${params.toString()}` : "";
        return get(`/log/tail${qs}`);
      },
    },
  };
}
