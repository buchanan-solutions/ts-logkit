import {
  handleNextLogControlSlug,
  type LogDispatchDeps,
  type NextSlugRouteContext,
} from "@buchanan-solutions/logkit/ring";

export type CreateNextLogControlHandlersOptions = LogDispatchDeps & {
  isAllowed: () => boolean | Promise<boolean>;
};

type RouteContext = {
  params: Promise<{ slug?: string[] }>;
};

export type NextLogControlRouteHandlers = {
  GET: (request: Request, routeCtx: RouteContext) => Promise<Response>;
  PUT: (request: Request, routeCtx: RouteContext) => Promise<Response>;
  DELETE: (request: Request, routeCtx: RouteContext) => Promise<Response>;
};

/**
 * Control plane for App Router `[[...slug]]/route.ts` beneath the chosen mount.
 */
export function createNextLogControlHandlers(
  options: CreateNextLogControlHandlersOptions,
): NextLogControlRouteHandlers {
  async function run(request: Request, routeCtx: RouteContext) {
    const params = await routeCtx.params;
    const slug = params.slug;
    const url = new URL(request.url);
    const result = await handleNextLogControlSlug(
      {
        method: request.method,
        slug,
        searchParams: url.searchParams,
        jsonBody: () => request.json(),
      },
      options,
    );
    return Response.json(result.body, { status: result.status });
  }

  return {
    GET: (request: Request, routeCtx: RouteContext) => run(request, routeCtx),
    PUT: (request: Request, routeCtx: RouteContext) => run(request, routeCtx),
    DELETE: (request: Request, routeCtx: RouteContext) => run(request, routeCtx),
  };
}

export type { LogDispatchDeps, NextSlugRouteContext };
