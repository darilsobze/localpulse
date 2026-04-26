"""
events_mock.py — Local events context signal (Module 01).

Stubs a local event calendar (replace with Eventbrite / city API in production).
Events affect merchant demand: high-impact events = more foot traffic = fewer quiet windows.

To swap in a real source: replace get_active_events() with an API call.
No codebase change needed — just this file.
"""

from datetime import datetime

# weekday: 0=Mon … 6=Sun
_EVENTS: list[dict] = [
    {
        "id": "ev_markt_tue",
        "name": "Wochenmarkt Luisenplatz",
        "type": "market",
        "icon": "🛒",
        "weekdays": [1, 4],       # Tue + Fri
        "hour_start": 7,
        "hour_end": 14,
        "demand_impact": "high",
        "location": [8.6512, 49.8728],
        "description": "Weekly market — heavy foot traffic at Luisenplatz.",
    },
    {
        "id": "ev_kabarett",
        "name": "Kabarett im Centralstation",
        "type": "concert",
        "icon": "🎭",
        "weekdays": [4, 5],       # Fri + Sat
        "hour_start": 19,
        "hour_end": 23,
        "demand_impact": "medium",
        "location": [8.6580, 49.8700],
        "description": "Evening show — post-concert crowd seeks food and drinks.",
    },
    {
        "id": "ev_stadtfest",
        "name": "Stadtfest Darmstadt",
        "type": "festival",
        "icon": "🎪",
        "weekdays": [5, 6],       # Sat + Sun
        "hour_start": 12,
        "hour_end": 22,
        "demand_impact": "high",
        "location": [8.6512, 49.8728],
        "description": "City festival — peak footfall all afternoon.",
    },
    {
        "id": "ev_tu_openday",
        "name": "TU Darmstadt Open Day",
        "type": "university",
        "icon": "🎓",
        "weekdays": [3],          # Thu
        "hour_start": 10,
        "hour_end": 17,
        "demand_impact": "medium",
        "location": [8.6630, 49.8776],
        "description": "University open day — visitors from outside the city.",
    },
]


def get_active_events(weekday: int | None = None, hour: int | None = None) -> list[dict]:
    now = datetime.now()
    wd = weekday if weekday is not None else now.weekday()
    h  = hour    if hour    is not None else now.hour
    return [
        e for e in _EVENTS
        if wd in e["weekdays"] and e["hour_start"] <= h < e["hour_end"]
    ]


def get_time_slot(hour: int | None = None) -> str:
    h = hour if hour is not None else datetime.now().hour
    if 5  <= h < 11: return "morning"
    if 11 <= h < 14: return "lunch"
    if 14 <= h < 17: return "afternoon"
    if 17 <= h < 20: return "feierabend"
    if h  >= 20:     return "evening"
    return "night"


def composite_label(
    temp: float,
    condition: str,
    quiet_score: float,
    events: list[dict],
    hour: int | None = None,
) -> str:
    parts: list[str] = []

    if temp >= 28:       parts.append("Hot day")
    elif temp >= 22:     parts.append("Warm day")
    elif temp <= 8:      parts.append("Cold day")
    elif temp <= 14:     parts.append("Cool day")

    if condition == "rainy":    parts.append("Rain outside")
    elif condition == "snowy":  parts.append("Snow falling")
    elif condition == "stormy": parts.append("Storm warning")

    if quiet_score >= 0.65:    parts.append("Very quiet spot")
    elif quiet_score >= 0.40:  parts.append("Quiet moment")

    slot_labels = {
        "morning": "Morning window", "lunch": "Lunch break",
        "afternoon": "Afternoon lull", "feierabend": "After-work hour",
        "evening": "Evening out",
    }
    slot = get_time_slot(hour)
    if slot in slot_labels:
        parts.append(slot_labels[slot])

    if events:
        parts.append(f"{events[0]['icon']} {events[0]['name']}")

    return " · ".join(parts[:3]) or "Quiet moment"
