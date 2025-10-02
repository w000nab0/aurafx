from __future__ import annotations

from datetime import datetime, time
from typing import Iterable, Sequence, Tuple
from zoneinfo import ZoneInfo

JST = ZoneInfo("Asia/Tokyo")
DEFAULT_BLACKOUT_WINDOWS: tuple[tuple[time, time], ...] = (
    (time(4, 0), time(9, 15)),
    (time(21, 20), time(21, 45)),
    (time(22, 25), time(23, 10)),
)

_blackout_windows: tuple[tuple[time, time], ...] = DEFAULT_BLACKOUT_WINDOWS


def set_blackout_windows(windows: Iterable[tuple[time, time]]) -> None:
    global _blackout_windows
    canonical: list[tuple[time, time]] = []
    for start, end in windows:
        if not isinstance(start, time) or not isinstance(end, time):
            raise TypeError("Blackout windows must be provided as time objects")
        canonical.append((start, end))
    _blackout_windows = tuple(sorted(canonical, key=lambda item: item[0]))


def get_blackout_windows() -> tuple[tuple[time, time], ...]:
    return _blackout_windows


def is_blackout(now: datetime | None = None) -> bool:
    """Return True when the given time falls within a blackout window."""
    if now is None:
        now = datetime.now(JST)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=JST)
    else:
        now = now.astimezone(JST)

    current = now.time()
    for start, end in _blackout_windows:
        if start <= current < end:
            return True
    return False


def serialize_blackout_windows(windows: Sequence[tuple[time, time]] | None = None) -> list[dict[str, str]]:
    target = windows if windows is not None else _blackout_windows
    return [{"start": start.strftime("%H:%M"), "end": end.strftime("%H:%M")} for start, end in target]


def parse_blackout_windows(items: Sequence[dict[str, str]]) -> tuple[tuple[time, time], ...]:
    parsed: list[tuple[time, time]] = []
    for item in items:
        try:
            start_str = item["start"]
            end_str = item["end"]
            start = _parse_time(start_str)
            end = _parse_time(end_str)
        except (KeyError, ValueError) as exc:  # ValueError from _parse_time
            raise ValueError(f"Invalid blackout window entry: {item}") from exc
        if start >= end:
            raise ValueError(f"Blackout start must be before end: {start_str} >= {end_str}")
        parsed.append((start, end))
    return tuple(parsed)


def _parse_time(value: str) -> time:
    try:
        hour, minute = value.split(":", maxsplit=1)
        return time(int(hour), int(minute))
    except Exception as exc:
        raise ValueError(f"Invalid time format '{value}'. Expected HH:MM.") from exc


__all__ = [
    "DEFAULT_BLACKOUT_WINDOWS",
    "JST",
    "get_blackout_windows",
    "is_blackout",
    "parse_blackout_windows",
    "serialize_blackout_windows",
    "set_blackout_windows",
]
