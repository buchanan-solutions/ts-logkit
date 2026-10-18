# @buchanan-solutions/logkit-fastify

## 1.0.0

### Stable release

- First stable standalone release of the Fastify logging adapter, extracted from the original project logging implementation. Includes service logger wiring and mount-relative debug routes, including health.
- Debug HTTP clients use the complete mount URL, with `/health`, `/tail`, `/loggers` and `/loggers/:id` relative to that mount.
- Align shared package dependencies to the `1.0.0` release: `@buchanan-solutions/logkit@1.0.0`, `@buchanan-solutions/logkit-otel@1.0.0`, `@buchanan-solutions/logkit-redis@1.0.0`.
