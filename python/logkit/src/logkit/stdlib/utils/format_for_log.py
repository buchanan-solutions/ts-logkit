# src/shared/logging/utils/format_for_log.py

import json
import pprint
from typing import Any

def format_for_log(message: str, data: Any) -> str:
    """
    Format a message and data object nicely for logging.

    Args:
        message (str): The log message prefix.
        data (Any): The data object to pretty-print.

    Returns:
        str: Formatted string ready for logging.
    """
    try:
        base_model_type = _base_model_type()
        if base_model_type is not None and isinstance(data, base_model_type):
            data_dict = data.model_dump()
            # formatted_data = json.dumps(data_dict, indent=2, default=str)
            formatted_data = pprint.pformat(data_dict)
        elif isinstance(data, (dict, list)):
            formatted_data = json.dumps(data, indent=2, default=str)
        elif isinstance(data, bytes):
            # CRITICAL CHANGE: Add errors='replace' for robust decoding
            try:
                formatted_data = data.decode("utf-8", errors="replace")
                # Optionally, try to parse as JSON if it looks like JSON
                if formatted_data.strip().startswith(("{", "[")):
                    try:
                        parsed_json = json.loads(formatted_data)
                        formatted_data = json.dumps(parsed_json, indent=2, default=str)
                    except json.JSONDecodeError:
                        # Not valid JSON, just use the decoded string
                        pass
            except Exception as decode_e:
                formatted_data = f"<Could not decode bytes: {decode_e}>"
        else:
            # Fallback: use pprint for arbitrary objects or str()
            formatted_data = pprint.pformat(data)
    except Exception as e:
        # Fallback if something goes wrong
        formatted_data = f"<Could not format data: {e}>"

    return f"{message}:\n{formatted_data}"


def _base_model_type() -> type[Any] | None:
    try:
        from pydantic import BaseModel
    except ImportError:
        return None
    return BaseModel
