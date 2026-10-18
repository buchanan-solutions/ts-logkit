# @buchanan-solutions/logkit-next

## 1.0.0

### Stable release

- First stable standalone release of the Next.js logging adapter, extracted from the original project logging implementation. Includes server logging, control/ingest handlers and browser transport wiring; the Node listener uses `@buchanan-solutions/logkit/ring/node`.
- Debug HTTP clients use the complete mount URL, with `/health`, `/tail`, `/loggers` and `/loggers/:id` relative to that mount.
- Align shared package dependencies to the `1.0.0` release: `@buchanan-solutions/logkit@1.0.0`, `@buchanan-solutions/logkit-otel@1.0.0`.
