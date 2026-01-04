import { Transport, Event } from "../types";

export function combineTransports(...transports: Transport[]): Transport {
  return {
    log(event: Event) {
      for (const t of transports) t.log(event);
    },
  };
}
