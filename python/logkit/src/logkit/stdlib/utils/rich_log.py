import logging
import re

from .levels import resolve_log_level


def rich_log(log: logging.Logger, level: int | str, msg: str, rich: bool):

    try:
        level = resolve_log_level(level)
    except ValueError as e:
        log.warning("Invalid level: %s: %s", level, e, exc_info=True)
        return

    # Check if any handler supports Rich markup
    if not rich:
        # Strip rich-style markup if handler does not support it
        msg = re.sub(r"\[/?[^\]]+\]", "", msg)
    log.log(level, msg)
