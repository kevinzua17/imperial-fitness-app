import re
from html import escape
from typing import Any


CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
SCRIPT_RE = re.compile(r"<\s*/?\s*(script|iframe|object|embed|link|meta|style)[^>]*>", re.IGNORECASE)
EVENT_HANDLER_RE = re.compile(r"\son\w+\s*=", re.IGNORECASE)
JAVASCRIPT_URL_RE = re.compile(r"javascript\s*:", re.IGNORECASE)


def sanitize_text(value: str, max_length: int = 2000) -> str:
    cleaned = CONTROL_CHARS_RE.sub("", value).strip()
    cleaned = SCRIPT_RE.sub("", cleaned)
    cleaned = EVENT_HANDLER_RE.sub(" data-removed=", cleaned)
    cleaned = JAVASCRIPT_URL_RE.sub("", cleaned)
    cleaned = escape(cleaned, quote=True)
    return cleaned[:max_length]


def sanitize_payload(value: Any) -> Any:
    if isinstance(value, str):
        return sanitize_text(value)
    if isinstance(value, list):
        return [sanitize_payload(item) for item in value]
    if isinstance(value, dict):
        return {key: sanitize_payload(item) for key, item in value.items()}
    return value