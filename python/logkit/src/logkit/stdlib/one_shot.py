import logging
from pathlib import Path
from typing import Any

from logkit.stdlib.apply import apply_state
from logkit.stdlib.bootstrap import bootstrap
from logkit.stdlib.mutate import merge_logger_levels
from logkit.stdlib.resolve import resolve_logging_env_path
from logkit.stdlib.state import LoggingState
from logkit.stdlib.utils import load_logging_env, resolve_log_level


def one_shot(
    root_level: int | str | None = None,
    logging_config_file_path: str | None = None,
    logger_levels: dict[str, int] = {},
    formatters: dict[str, dict[str, Any]] | None = None,
    handlers: dict[str, dict[str, Any]] | None = None,
    disable_existing_loggers: bool = False,
    rich: bool = False,
) -> LoggingState:
    # use this to call the bootstrap, resolve,
    # 1) Define baseline state (no runtime side effects)
    state = bootstrap(
        root_level=(
            logging.WARNING
            if root_level is None
            else resolve_log_level(root_level)
        ),
        logger_levels=logger_levels,
        formatters=formatters,
        handlers=handlers,
        disable_existing_loggers=disable_existing_loggers,
        rich=rich,
    )

    apply_state(state)

    # 2) Resolve env file path: CLI > LOGGING_CONFIG_FILE > {project}/logging.env
    config_path = resolve_logging_env_path(logging_config_file_path)
    file_levels: dict[str, int] = {}
    if config_path and Path(config_path).expanduser().is_file():
        file_levels = load_logging_env(config_path)

    # Additive: file levels, then CLI overrides win per key
    state = merge_logger_levels(state, {**file_levels, **logger_levels})

    # 3) Activate logging, then export same artifact for workers
    apply_state(state)

    return state
