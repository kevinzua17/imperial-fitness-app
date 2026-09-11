from __future__ import annotations

from datetime import UTC, datetime


def utcnow() -> datetime:
    """Return a timezone-normalized UTC datetime compatible with naive DB columns.

    SQLAlchemy models in this project use DateTime without timezone so this helper
    keeps storage stable while avoiding Python 3.12+ utcnow() warnings.
    """
    return datetime.now(UTC).replace(tzinfo=None)
