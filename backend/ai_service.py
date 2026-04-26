"""
ai_service.py – Generative AI Angebots-Engine

Nutzt die OpenAI API (gpt-4o-mini) für hyperpersonalisierte Werbetexte.
Fällt auf das Template-System zurück, wenn kein API-Key gesetzt ist.
"""

import json
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ── OpenAI Client (lazy init so import doesn't crash ohne API-Key) ─────────
_client: OpenAI | None = None

def _get_client() -> OpenAI | None:
    global _client
    if _client is None and os.getenv("OPENAI_API_KEY"):
        _client = OpenAI()
    return _client


# ── Prompts & Schema ──────────────────────────────────────────────────────
_SYSTEM_PROMPT = (
    "Du bist ein lokaler Marketing-Experte für die Coupon-App LocalPulse. "
    "Deine Aufgabe: Erstelle hyperpersonalisierte Werbetexte auf Deutsch – "
    "maximal 3 Sekunden Lesedauer, jugendlich, mit Dringlichkeit. "
    "title: ≤50 Zeichen, catchy. description: ≤80 Zeichen, Zeitdruck spürbar. "
    "Antworte ausschließlich als JSON mit den Feldern title und description."
)

_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "title":       {"type": "string"},
        "description": {"type": "string"},
    },
    "required": ["title", "description"],
    "additionalProperties": False,
}


# ── Wetter-Kontexte (WMO-Codes) ───────────────────────────────────────────
def _weather_context(temp: float, code: int) -> str:
    if temp >= 28 and code == 0:       return "heiss_sonnig"
    if temp >= 22 and code <= 3:       return "warm"
    if temp < 12:                      return "kalt"
    if code in range(51, 68):          return "regen"
    if code in range(71, 78):          return "schnee"
    if code in range(1, 4):            return "bewoelkt"
    return "mild"


# ── Templates als Fallback ────────────────────────────────────────────────
_TEMPLATES: dict[tuple[str, str], dict[str, str]] = {
    ("ice_cream", "heiss_sonnig"): {
        "title":       "{temp}°C – Abkühlung bei {name}! 🍦",
        "description": "{discount}% auf dein Lieblingseis. Nur 15 Minuten!",
    },
    ("ice_cream", "warm"): {
        "title":       "Perfektes Eiswetter bei {name} ☀️",
        "description": "Gönn dir eine Pause: {discount}% auf alles. Läuft ab!",
    },
    ("cafe", "heiss_sonnig"): {
        "title":       "Eiskalt bei {name} ☕❄️",
        "description": "Eiskaffee & Limo – {discount}% für 30 min. Freie Plätze!",
    },
    ("cafe", "regen"): {
        "title":       "Regen draußen, gemütlich bei {name} ☔",
        "description": "{discount}% auf alles Warme – nur heute!",
    },
    ("cafe", "kalt"): {
        "title":       "Aufwärmen bei {name} ☕",
        "description": "Bei {temp}°C: {discount}% auf heiße Getränke – komm rein!",
    },
    ("restaurant", "heiss_sonnig"): {
        "title":       "Mittag bei {name} – {discount}% Rabatt 🍽️",
        "description": "Klimatisierter Genuss. Nur für 1 Stunde!",
    },
    ("restaurant", "regen"): {
        "title":       "Regen & Hunger? {name} hat die Lösung 🍽️",
        "description": "{discount}% auf das Mittagsangebot – Tische frei!",
    },
    ("restaurant", "warm"): {
        "title":       "Lunch-Deal bei {name} heute! 🍽️",
        "description": "{discount}% auf das Tagesmenü. Jetzt reservieren!",
    },
    ("bakery", "heiss_sonnig"): {
        "title":       "Frisch aus dem Ofen bei {name} 🥐",
        "description": "{discount}% auf alle Backwaren – Sonnenpause genießen!",
    },
    ("bakery", "regen"): {
        "title":       "Frischer Kaffee & Croissant bei {name} ☕",
        "description": "Der perfekte Regen-Snack – {discount}% jetzt!",
    },
    ("bar", "warm"): {
        "title":       "Feierabend? {name} freut sich auf dich 🍻",
        "description": "{discount}% auf alle Getränke – heute noch viel Platz!",
    },
    ("bar", "heiss_sonnig"): {
        "title":       "Kühle Drinks bei {name} – {discount}% 🍺",
        "description": "Bei {temp}°C ist ein kaltes Getränk Pflicht. Komm vorbei!",
    },
}

_FALLBACK_TEMPLATE: dict[str, str] = {
    "title":       "Exklusiv für dich: {discount}% bei {name} 🎯",
    "description": "Dein LocalPulse-Deal – jetzt einlösen. Nur kurze Zeit!",
}


# ── Haupt-Funktion ────────────────────────────────────────────────────────
def generate_offer_text(merchant: dict, context: dict) -> dict:
    """
    Generiert hyperpersonalisierten Angebotstext.
    Nutzt OpenAI API wenn OPENAI_API_KEY gesetzt, sonst Templates.

    merchant: dict aus merchants.json
    context:  { temperature: float, weather_code: int, ... }
    """
    temp     = float(context.get("temperature", 20))
    code     = int(context.get("weather_code", 0))
    category = merchant.get("category", "default")
    discount = merchant.get("limits", {}).get("max_discount_pct", 15)
    name     = merchant.get("name", "dem Händler")

    weather_ctx = _weather_context(temp, code)
    client      = _get_client()

    if client:
        try:
            user_prompt = (
                f"Händler: {name} (Kategorie: {category})\n"
                f"Temperatur: {round(temp)}°C, Wetterlage: {weather_ctx}\n"
                f"Maximaler Rabatt: {discount}%\n"
                f"Erstelle einen passenden Angebotstext."
            )

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=200,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "offer_text",
                        "strict": True,
                        "schema": _OUTPUT_SCHEMA,
                    },
                },
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ],
            )

            ai_result = json.loads(response.choices[0].message.content)

            return {
                "title":           ai_result["title"],
                "description":     ai_result["description"],
                "discount_pct":    discount,
                "weather_context": weather_ctx,
                "source":          "openai",
            }

        except Exception as e:
            print(f"[ai_service] OpenAI API Fehler, nutze Template-Fallback: {e}")

    # ── Template-Fallback ────────────────────────────────────────────────
    template = _TEMPLATES.get((category, weather_ctx), _FALLBACK_TEMPLATE)
    fill     = {"name": name, "temp": round(temp), "discount": discount}

    return {
        "title":           template["title"].format(**fill),
        "description":     template["description"].format(**fill),
        "discount_pct":    discount,
        "weather_context": weather_ctx,
        "source":          "template_fallback",
    }
