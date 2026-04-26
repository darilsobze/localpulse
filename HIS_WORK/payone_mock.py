"""
payone_mock.py – Simulierte Payone Transaktionsdichte

Der "Unfair Advantage" für den DSV Hackathon:
Simuliert Echtzeit-Transaktionsdichten pro Händler basierend auf
realistischen Tagesverläufen je Kategorie.

In Produktion: get_current_transaction_density() durch echten Payone-API-Call ersetzen.
"""

import random
from datetime import datetime


# Erwartete Transaktionen pro Stunde nach Kategorie (Index = Stunde 0–23)
_PATTERNS: dict[str, list[float]] = {
    "ice_cream":  [0, 0, 0, 0, 0, 0, 1, 2, 4, 7, 10, 12, 14, 16, 20, 22, 20, 16, 11, 7,  4,  2,  1,  0],
    "cafe":       [0, 0, 0, 0, 0, 2, 6, 14,16,13,  9, 11, 14, 10, 13, 11,  8,  6,  5,  4,  3,  2,  1,  0],
    "restaurant": [0, 0, 0, 0, 0, 0, 1, 2, 4, 6,  9, 20, 22, 18,  8,  5,  5,  9, 20, 22, 15,  8,  4,  1],
    "bakery":     [0, 0, 0, 0, 1, 5,16, 22,18,14,  9,  7,  5,  4,  3,  3,  3,  3,  2,  2,  1,  1,  0,  0],
    "bar":        [0, 0, 0, 0, 0, 0, 0, 0, 1, 2,  3,  5,  7,  6,  5,  5,  6,  8, 13, 20, 24, 22, 14,  6],
    "default":    [1, 1, 1, 1, 1, 1, 3, 6, 9,11, 13, 15, 15, 13, 11, 11, 11, 11,  9,  8,  6,  4,  3,  2],
}

# Gespeicherte Händler-Kategorieen für schnellen Lookup (wird von main.py befüllt)
_merchant_cache: dict[str, dict] = {}


def _register_merchants(merchants: list[dict]) -> None:
    """Wird von main.py beim Start aufgerufen, damit der Mock Kategoriedaten kennt."""
    for m in merchants:
        _merchant_cache[m["id"]] = m


def _expected_tph(category: str, hour: int, minute: int) -> float:
    """Interpoliere zwischen aktueller und nächster Stunde für glattere Werte."""
    pattern = _PATTERNS.get(category, _PATTERNS["default"])
    base = pattern[hour]
    nxt  = pattern[(hour + 1) % 24]
    return base + (nxt - base) * (minute / 60.0)


def get_current_transaction_density(merchant_id: str) -> float:
    """
    Gibt die aktuelle simulierte TPH (Transaktionen pro Stunde) zurück.
    Kompatibel mit dem ursprünglichen Interface in main.py.
    """
    return get_payone_signal(merchant_id)["current_tph"]


def get_payone_signal(merchant_id: str) -> dict:
    """
    Vollständiges Payone-Signal mit Flauten-Erkennung.

    quiet_score: 0.0 = voll ausgelastet  |  1.0 = komplett leer
    is_quiet:    True wenn >40% unter dem Tages-Erwartungswert
    """
    merchant   = _merchant_cache.get(merchant_id, {})
    category   = merchant.get("category", "default")
    force_quiet = merchant.get("_demo_force_quiet", False)

    now      = datetime.now()
    expected = _expected_tph(category, now.hour, now.minute)

    if force_quiet:
        # Demo-Modus: Händler befindet sich künstlich in der Flaute
        current = round(expected * random.uniform(0.08, 0.28), 1)
    else:
        current = round(expected * random.uniform(0.80, 1.20), 1)

    quiet_score = max(0.0, round(1.0 - (current / max(expected, 0.1)), 2))

    return {
        "merchant_id":  merchant_id,
        "current_tph":  current,
        "expected_tph": round(expected, 1),
        "quiet_score":  quiet_score,
        "is_quiet":     quiet_score > 0.40,
        "hour":         now.hour,
        "source":       "payone_mock_v1",
    }
