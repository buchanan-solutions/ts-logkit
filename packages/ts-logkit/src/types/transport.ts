import { Event } from "./event";
import { Formatter } from "./formatter";

/**
 * Transport for a logger
 * @interface Transport
 * @description This is the transport object for a logger. It receives the full Event object and decides how to handle it.
 * Transports can format the event themselves or use a formatter, serialize it, send it over the network, etc.
 * @property {Event} event - The log event to transport
 * @property {Formatter} [formatter] - The formatter to use for formatting the event. Defaults to no formatting.
 */
export interface Transport {
  log(event: Event, formatter?: Formatter): void;
}
