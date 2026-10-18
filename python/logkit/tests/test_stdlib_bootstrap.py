from __future__ import annotations

import logging

from logkit.stdlib import apply_state, bootstrap


def test_bootstrap_apply_without_rich() -> None:
    state = bootstrap(root_level=logging.INFO, rich=False)
    apply_state(state)
    root = logging.root
    assert root.level == logging.INFO
