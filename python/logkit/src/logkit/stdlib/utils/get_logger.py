import inspect
import logging


def get_logger():
    current = inspect.currentframe()
    if current is None or current.f_back is None:
        raise RuntimeError("Cannot determine caller frame for get_logger")
    caller = current.f_back
    func_name = caller.f_code.co_name
    mod_name = caller.f_globals.get("__name__", "__main__")
    return logging.getLogger(f"{mod_name}.{func_name}")
