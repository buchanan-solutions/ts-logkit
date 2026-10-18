import { handleNextLogIngestRequest, type LogDispatchDeps } from "@buchanan-solutions/logkit/ring";

export type CreateNextLogIngestHandlersOptions = LogDispatchDeps & {
  isAllowed: () => boolean | Promise<boolean>;
};

export type NextLogIngestRouteHandlers = {
  POST: (request: Request) => Promise<Response>;
};

/**
 * Garage client log ingest — plain `route.ts` POST (no /log segment).
 */
export function createNextLogIngestHandlers(
  options: CreateNextLogIngestHandlersOptions,
): NextLogIngestRouteHandlers {
  return {
    POST: async (request: Request) => {
      const result = await handleNextLogIngestRequest({ jsonBody: () => request.json() }, options);
      return Response.json(result.body, { status: result.status });
    },
  };
}
