# src/shared/logging/env_loader.py
import logging
from pathlib import Path

from .levels import is_valid_level, resolve_log_level

log = logging.getLogger(__name__)


def load_logging_env(file_path: str) -> dict[str, int]:
    """
    Load logging levels from a simple `.env`-style file.

    Each line must be:
        LOGGER_NAME=LEVEL

    - Lines starting with `#` or empty lines are ignored.
    - Only valid logging levels are included.
    - Malformed lines or invalid levels emit warnings with line number.
    """
    path = Path(file_path)
    if not path.exists():
        return {}

    logger_levels: dict[str, int] = {}

    for lineno, line in enumerate(path.read_text().splitlines(), start=1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        if "=" not in line:
            log.warning("Skipping invalid line %d: %r (missing '=')", lineno, line)
            continue

        name, level_str = line.split("=", 1)
        name = name.strip()
        level_str = level_str.strip()

        if not name or not level_str:
            log.warning(
                "Skipping invalid line %d: %r (empty logger name or level)",
                lineno,
                line,
            )
            continue

        if not is_valid_level(level_str):
            log.warning(
                "Skipping invalid line %d: unknown logging level %r for logger %r",
                lineno,
                level_str,
                name,
            )
            continue

        logger_levels[name] = resolve_log_level(level_str)

    return logger_levels


# def load_logging_env(file_path: str) -> dict[str, int]:
#     path = Path(file_path)
#     if not path.exists():
#         return {}

#     logger_levels = {}
#     for line in path.read_text().splitlines():
#         line = line.strip()
#         if not line or line.startswith("#"):
#             continue
#         if "=" not in line:
#             continue
#         name, level = line.split("=", 1)
#         logger_levels[name.strip()] = getattr(logging, level.strip().upper())
#     return logger_levels
