from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List


@dataclass
class Event:
    timestamp: datetime
    name: str
    payload: Dict[str, Any] = field(default_factory=dict)


class EventCollector:
    """
    Collects structured events for later forwarding to telemetry backends.
    """

    def __init__(self) -> None:
        self._events: List[Event] = []

    def record(self, name: str, **payload: Any) -> None:
        self._events.append(Event(timestamp=datetime.utcnow(), name=name, payload=payload))

    def export(self) -> List[Event]:
        return list(self._events)

