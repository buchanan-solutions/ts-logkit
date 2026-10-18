# @buchanan-solutions/logkit-mcp

## 1.0.0

### Stable release

- First stable standalone release of the stdio logging MCP, extracted from the original project logging implementation. Ships the `logkit-mcp` executable and the six debug tools.
- Debug HTTP clients use the complete mount URL, with `/health`, `/tail`, `/loggers` and `/loggers/:id` relative to that mount.
- Align shared package dependencies to the `1.0.0` release: `@buchanan-solutions/logkit@1.0.0`.
