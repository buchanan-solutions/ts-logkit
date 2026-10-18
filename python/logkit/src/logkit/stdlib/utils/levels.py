import logging


def get_logger_levels() -> list[str]:
    return sorted(logging.getLevelNamesMapping().keys())


def is_valid_level(level: str | int) -> bool:
    try:
        resolve_log_level(level)
        return True
    except ValueError:
        return False


def resolve_log_level(level: str | int) -> int:
    """
    Takes a logging level as a string or int and returns a logging level int.

    If a string is provided, it matches any attribute on the logging module, case-insensitive.
    Raises ValueError if the given value can't be resolved.
    """
    # All logging levels (including custom ones registered by code elsewhere)
    if isinstance(level, int):
        if level in logging._nameToLevel.values():
            return level
        # Allow custom numeric levels not in _nameToLevel
        return level
    if not isinstance(level, str):
        raise TypeError("Level must be str or int")
    name = level.upper()
    # Try predefined levels
    if name in logging._nameToLevel:
        return logging._nameToLevel[name]
    # Try custom levels set dynamically as attributes of the logging module
    if hasattr(logging, name):
        value = getattr(logging, name)
        if isinstance(value, int):
            return value
    # Check if user passed a string representation of a number
    try:
        value = int(level)
        return value
    except Exception:
        pass
    raise ValueError(f"Unknown logging level: {level!r}")
