import inspect
import logging


def child_logger_function(
    parent: logging.Logger | None = None, base_name: str | None = None
) -> logging.Logger:
    """
    Return a child logger with name parent.name + calling function name.
    If no parent is provided, defaults to __name__ + calling function name.

    If the base logger's last name segment already equals the caller's function
    name (common when ``__name__`` is ``pkg.mod`` and the only top-level function
    in ``mod.py`` is ``mod``), the base logger is returned as-is to avoid
    ``pkg.mod.mod``.
    """
    current = inspect.currentframe()
    if current is None or current.f_back is None:
        raise RuntimeError("Cannot determine caller frame for child logger name")
    caller = current.f_back
    func_name = caller.f_code.co_name

    base_logger = parent or logging.getLogger(
        base_name or caller.f_globals.get("__name__", "__main__")
    )
    base = base_logger.name
    if base.rpartition(".")[-1] == func_name:
        return base_logger
    return logging.getLogger(f"{base}.{func_name}")
