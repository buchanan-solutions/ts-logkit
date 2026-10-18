import logging

_COLORS = {
    "CYAN": "\033[36m",  # cyan
    "GREEN": "\033[32m",  # green
    "GRAY": "\033[90m",  # gray
    "YELLOW": "\033[33m",  # yellow
    "RED": "\033[31m",  # red
    "BOLD_RED": "\033[1;31m",  # bold red
    "RESET": "\033[0m",  # reset
}

_STYLES = {
    "ITALIC": "\033[3;90m",  # italic + dim grey
}

_LEVEL_COLORS: dict[int, str] = {
    logging.DEBUG: _COLORS["CYAN"],  # cyan
    logging.INFO: _COLORS["GREEN"],  # green
    logging.WARNING: _COLORS["YELLOW"],  # yellow
    logging.ERROR: _COLORS["RED"],  # red
    logging.CRITICAL: _COLORS["BOLD_RED"],  # bold red
}
_RESET = _COLORS["RESET"]
_LOGGER_STYLE = _COLORS["GRAY"] + _STYLES["ITALIC"]  # italic + dim grey

# Rich markup for the same logger-name look (use with RichHandler markup=True, not ANSI).
_LOGGER_RICH_OPEN = "[dim italic]"
_LOGGER_RICH_CLOSE = "[/dim italic]"
