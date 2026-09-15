import { Event, Formatter, FormattedOutput } from "../types";

export const ANSI_COLORS = {
    trace: '\x1b[90m',
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    fatal: '\x1b[41m',
}

const ITALIC = '\x1b[3m'
const GREY = '\x1b[90m'

const RESET = '\x1b[0m'

export function formatDefault(event: Event): FormattedOutput {
    const color = ANSI_COLORS[event.level as keyof typeof ANSI_COLORS] as string

    const levelLabel = ('[' + event.level.toUpperCase() + ']').padEnd(7)

    const parts: unknown[] = [
        `${color}${levelLabel}${RESET} ${ITALIC}${GREY}${event.logger_id}${RESET} \t${event.message}`,
        ...(event.args ?? []),
        ...(event.error ? [event.error] : []),
    ]

    return parts as [string, ...unknown[]]
}

/**
 * @deprecated Use defaultFormatter instead
 */
export function formatDev(event: Event): FormattedOutput {
    return formatDefault(event)
}

/**
 * Development formatter for Node.js environments
 * Uses ANSI color codes for terminal output
 */
export const defaultFormatter: Formatter = { format: formatDefault }

/**
 * @deprecated Use defaultFormatter instead
 */
export const devFormatter: Formatter = { format: formatDev }
