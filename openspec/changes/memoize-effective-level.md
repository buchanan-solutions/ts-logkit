# Follow-up: memoize effective level

**Status:** later / optional. Not part of `ts-logkit-live-updates` implementation.  
**Parent:** [`requirements.md`](./requirements.md), [`design.md`](./design.md)

No public API change. Call sites stay `child()`, `setLevel`, `update`, `unset`.

---

## Why not now

v1 walk is O(dot depth) in-memory `Map.get` (typically 3–8 hops). That is cheap next to format/transport. Do it when `shouldLog` shows up in a profile.

v1 **does** lock: emit never hits the Store. This follow-up only caches the **answer** of that walk.

---

## What

On each live logger (or a side Map keyed by id), remember `effectiveLevel` after the first walk in a generation.

`shouldLog` uses the memo when valid; otherwise walks cache as in design §4 and stores the result.

---

## Invalidate

On `update` / `unset` / `setLevel` / `clearLevel` of id `X`:

- Drop memo for `X` and every **registered** id with prefix `X.` (in-memory scan), **or**
- Bump a process generation and lazy-recompute on next `shouldLog`

Still **no Store** on emit. Invalidation is local to the registry map.

Subscribe that patches `X` uses the same invalidation as `update(X)`.

---

## Not this follow-up

- Redis / localStorage prefix index  
- Cascade / `*` batch set  
- Lazy `store.get` on cache miss  
- Changing configured vs effective semantics

---

## Ship when

Profiling shows ancestor walk in the noise of `debug()` volume. Until then, keep the plain walk.
