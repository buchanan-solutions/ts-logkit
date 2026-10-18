---
"@buchanan-solutions/logkit": minor
"@buchanan-solutions/logkit-next": patch
---

Keep `/ring` browser-safe and expose the existing Node HTTP listener through `/ring/node`. Server consumers must import `ensureDebugHttpServer` and its options from the Node subpath. Update the Next server adapter to use that entry.
