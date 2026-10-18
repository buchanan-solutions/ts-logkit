import logging

from .styles import _LEVEL_COLORS, _RESET


class LevelColorFormatter(logging.Formatter):
    """ANSI-colored level names; pads level before coloring so widths stay aligned."""

    def format(self, record: logging.LogRecord) -> str:
        saved = record.levelname
        color = _LEVEL_COLORS.get(record.levelno, "")
        padded = f"{saved:8}"
        record.levelname = f"{color}{padded}{_RESET}" if color else padded
        try:
            return super().format(record)
        finally:
            record.levelname = saved
