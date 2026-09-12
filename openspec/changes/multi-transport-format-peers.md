# Future: multi-transport × formatter peers

**Status:** later / optional. **Not** part of `notset-inheritance` / kit 0.4.  
**Problem today:** factory/logger hold `transports[]` + **one** `formatter`. `emit` calls every transport with the **same** formatter. Multi-sink with one format works; **different format per sink** needs a transport that ignores the shared formatter.

---

## Goal

One factory (one process logging setup) can declare **peer groups**: each group = **one formatter** + **one or more transports**. A single `log.info(...)` fans out to every group.

### Examples

| Peer group | Formatter | Transports |
|---|---|---|
| A | JSON / structured | HTTP ingest, file, OpenTelemetry exporter (same format → 3 sinks) |
| B | `devFormatter` (ANSI) | stdout / console |

So: **same format → N APIs/sinks**; **2nd format → stdout** — without wrapping transports by hand.

---

## Sketch (API TBD)

```ts
createLoggerFactory({
  // today (keep as sugar / default group):
  // transports, formatter

  // future:
  peers: [
    {
      formatter: jsonFormatter,
      transports: [httpTransport, fileTransport, otelTransport],
    },
    {
      formatter: devFormatter,
      transports: [createConsoleTransport()],
    },
  ],
})
```

`emit`: for each peer, for each transport in that peer → `transport.log(event, peer.formatter)`.

Level filter / NOTSET / registry stay **once** per logger (before fan-out).

---

## Constraints

- Additive: existing `transports` + `formatter` remain valid (= one implicit peer).
- No change to `getLogger` / NOTSET / Store.
- Child loggers inherit peer list (or factory defaults) like they inherit transports today.
- Per-logger override of peers is optional later.

---

## Not this doc

- NOTSET inheritance (0.4)  
- Memoize effective level  
- Ops-api HTTP loggers  

---

## When to build

When a consumer needs structured remote + pretty local without custom transport closures. Until then, workaround: transport closes over its own formatter and ignores the argument.
