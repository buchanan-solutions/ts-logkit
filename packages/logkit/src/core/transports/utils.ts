import { Transport, Event, Formatter } from "../types";

export function combineTransports(...transports: Transport[]): Transport {
  return {
    log(event: Event, formatter?: Formatter) {
      for (const t of transports) t.log(event, formatter);
    },
  };
}
