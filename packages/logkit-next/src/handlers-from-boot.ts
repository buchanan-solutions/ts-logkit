import {
  createNextLogControlHandlers,
  type NextLogControlRouteHandlers,
} from "./handlers-control.ts";
import { createNextLogIngestHandlers, type NextLogIngestRouteHandlers } from "./handlers-ingest.ts";
import { getNextServerLoggingState } from "./register-server-logging.ts";

export type CreateNextLogHandlersFromBootOptions = {
  app: string;
  globalKey?: string;
  isAllowed: () => boolean | Promise<boolean>;
};

const NOT_REGISTERED = {
  status: 503,
  body: { error: "next server logging is not registered" },
} as const;

function notRegisteredControlHandlers(): NextLogControlRouteHandlers {
  const respond = () =>
    Promise.resolve(Response.json(NOT_REGISTERED.body, { status: NOT_REGISTERED.status }));
  return {
    GET: respond,
    PUT: respond,
    DELETE: respond,
  };
}

function notRegisteredIngestHandlers(): NextLogIngestRouteHandlers {
  return {
    POST: () =>
      Promise.resolve(Response.json(NOT_REGISTERED.body, { status: NOT_REGISTERED.status })),
  };
}

function resolveBootState(options: CreateNextLogHandlersFromBootOptions) {
  return getNextServerLoggingState(
    options.globalKey != null
      ? { app: options.app, globalKey: options.globalKey }
      : { app: options.app },
  );
}

export function createNextLogControlHandlersFromBoot(
  options: CreateNextLogHandlersFromBootOptions,
): NextLogControlRouteHandlers {
  const state = resolveBootState(options);
  if (state == null) {
    return notRegisteredControlHandlers();
  }

  return createNextLogControlHandlers({
    loggerRegistry: state.loggerRegistry,
    logRing: state.logRing,
    isAllowed: options.isAllowed,
  });
}

export function createNextLogIngestHandlersFromBoot(
  options: CreateNextLogHandlersFromBootOptions,
): NextLogIngestRouteHandlers {
  const state = resolveBootState(options);
  if (state == null) {
    return notRegisteredIngestHandlers();
  }

  return createNextLogIngestHandlers({
    loggerRegistry: state.loggerRegistry,
    logRing: state.logRing,
    isAllowed: options.isAllowed,
  });
}
