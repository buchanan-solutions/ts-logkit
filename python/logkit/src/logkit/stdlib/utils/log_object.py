import logging

from logkit.stdlib.utils.levels import resolve_log_level


def log_object(
    obj: object,
    log: logging.Logger,
    level: str | int = logging.DEBUG,
    console: object | None = None,
    label: str | None = None,
):
    level = resolve_log_level(level)
    if log.getEffectiveLevel() > level:
        return

    if console is not None:
        from rich.console import Console
        from rich.pretty import Pretty

        if not isinstance(console, Console):
            console = Console()
        pretty = Pretty(obj, expand_all=True, indent_guides=True)
        if label:
            from rich.panel import Panel

            console.print(
                Panel(
                    pretty,
                    border_style="blue",
                    padding=(1, 2),
                    title=label,
                    title_align="left",
                )
            )
        else:
            console.print(pretty)
    else:
        log.log(level, f"{label}: {obj}")
