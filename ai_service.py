"""
ai_service.py – Generative AI Angebots-Engine

Nutzt Gemma 4 2B (lokal / privacy-first) für hyperpersonalisierte Werbetexte.
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
    "Erstelle zusätzlich 1-2 alternative Empfehlungen basierend auf der Uhrzeit oder "
    "dem Wochentag (z.B. 'Komm später zum Dinner' oder 'Dein Highlight fürs Wochenende'). "
    "Jede Alternative braucht title (≤45 Zeichen), description (≤70 Zeichen) und "
    "context_reason (kurze Begründung warum jetzt passend, ≤40 Zeichen). "
    "Antworte ausschließlich als JSON."
)

_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "title":       {"type": "string"},
        "description": {"type": "string"},
        "alternatives": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title":          {"type": "string"},
                    "description":    {"type": "string"},
                    "context_reason": {"type": "string"},
                },
                "required": ["title", "description", "context_reason"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "description", "alternatives"],
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

    weekday_name     = context.get("weekday_name", "")
    is_weekend       = context.get("is_weekend", False)
    holiday_name     = context.get("holiday_name")
    time_slot        = context.get("time_slot", "")
    vibe_state       = context.get("vibe_state", "unknown")
    pace_class       = context.get("pace_class", "unknown")
    receptivity      = float(context.get("receptivity", 0.5))
    offer_format     = context.get("offer_format", "full_experience")
    activity_context = context.get("activity_context", "unknown")

    # Tone instructions derived from on-device vibe — core of hyperpersonalization
    _VIBE_TONE: dict[str, str] = {
        "lingering":   (
            "Der Nutzer verweilt gerade – er hat Zeit und ist maximal offen. "
            "Ton: einladend, warm, erlebnisorientiert. Keine Zeitdruck-Rhetorik. "
            "Sprich ihn an als hätte er gerade nichts vor. Biete ein Erlebnis an."
        ),
        "exploring":   (
            "Der Nutzer erkundet die Gegend – neugierig, offen für Überraschungen. "
            "Ton: entdeckerfreudig, spielerisch. Wecke Neugier, nicht Dringlichkeit."
        ),
        "strolling":   (
            "Der Nutzer spaziert gemütlich. Mittlere Empfänglichkeit. "
            "Ton: freundlich, kurz, leicht verlockend. Ein sanfter Impuls reicht."
        ),
        "commuting":   (
            "Der Nutzer ist in Eile – zielgerichtet, hohe Schrittfrequenz. "
            "Ton: ultra-kurz, präzise, kein Schnörkel. Betone 'schnell', '2 Minuten', "
            "'einfach mitnehmen'. Maximal 2 Sekunden Lesezeit. QR-Code-First-Ansatz."
        ),
        "post_errand": (
            "Der Nutzer hat gerade seinen Errand erledigt – entspannt, leichte Belohnungsbereitschaft. "
            "Ton: belohnend, leicht euphorisch. 'Du hast es dir verdient'-Feeling."
        ),
        "unknown":     (
            "Standard freundlicher Ton. Kurz und klar."
        ),
    }
    tone_hint = _VIBE_TONE.get(vibe_state, _VIBE_TONE["unknown"])
    format_hint = (
        "WICHTIG: Nutzer ist in Eile. Angebot muss in <30 Sekunden einlösbar sein. "
        "title maximal 35 Zeichen. Betone Schnelligkeit explizit."
        if offer_format == "quick_grab"
        else "Das Angebot kann ein vollständiges Erlebnis beschreiben."
    )

    if client:
        try:
            calendar_line = (
                f"Heute: {weekday_name}"
                + (" (Wochenende)" if is_weekend else "")
                + (f" – Feiertag: {holiday_name}" if holiday_name else "")
            )
            user_prompt = (
                f"Händler: {name} (Kategorie: {category})\n"
                f"Temperatur: {round(temp)}°C, Wetterlage: {weather_ctx}\n"
                f"Tageszeit: {time_slot}\n"
                f"{calendar_line}\n"
                f"Maximaler Rabatt: {discount}%\n"
                f"\nNUTZER-VIBE (hyperpersonalisiert):\n"
                f"Bewegungsstatus: {vibe_state} (Schrittfrequenz: {pace_class})\n"
                f"Empfänglichkeit: {round(receptivity*100)}%\n"
                f"Angebotsformat: {offer_format}\n"
                f"Aktivitätskontext: {activity_context}\n"
                f"\nTon-Anweisung: {tone_hint}\n"
                f"{format_hint}\n"
                f"\nErstelle das Hauptangebot für jetzt und 1-2 passende Alternativen."
            )

            response = client.chat.completions.create(
                model="gemma-4-2b",
                max_tokens=400,
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
                "alternatives":    ai_result.get("alternatives", []),
                "source":          "openai",
            }

        except Exception as e:
            print(f"[ai_service] OpenAI API Fehler, nutze Template-Fallback: {e}")

    # ── Template-Fallback (vibe-aware) ───────────────────────────────────
    base = _TEMPLATES.get((category, weather_ctx), _FALLBACK_TEMPLATE)
    fill = {"name": name, "temp": round(temp), "discount": discount}

    # Override title/description with vibe-specific variants when available
    _VIBE_OVERRIDES: dict[tuple[str, str], dict[str, str]] = {
        ("commuting", "ice_cream"):  {"title": "Schnell vorbei? {discount}% Eis to-go! ⚡", "description": "QR-Code, 30 Sek., fertig. Kein Anstehen."},
        ("commuting", "cafe"):       {"title": "Kaffee to-go bei {name} – {discount}% ⚡",   "description": "Einfach QR zeigen, mitnehmen, weiter."},
        ("commuting", "bakery"):     {"title": "{discount}% – schnell bei {name} vorbei 🥐",  "description": "Ideal für unterwegs. Kein Warten."},
        ("lingering", "cafe"):       {"title": "Zeit für eine Pause bei {name} ☕",           "description": "Kein Stress – setz dich, {discount}% auf alles."},
        ("lingering", "restaurant"): {"title": "Bleib noch etwas – {name} hat Platz 🍽️",    "description": "Perfekte Zeit für ein Mittagsmenü – {discount}% jetzt!"},
        ("exploring", "ice_cream"):  {"title": "Entdecke {name} – {discount}% auf Eis 🗺️",  "description": "Auf Entdeckungstour? Perfekter Zwischenstopp!"},
        ("post_errand", "cafe"):     {"title": "Du hast es dir verdient – {name} ☕",         "description": "{discount}% als kleines Belohnungs-Ritual!"},
        ("post_errand", "ice_cream"):{"title": "Erledigungen fertig? Eis verdient! 🍦",       "description": "{discount}% – du weißt, du willst es."},
    }
    override = _VIBE_OVERRIDES.get((vibe_state, category))
    template = override if override else base
    alternatives = _build_fallback_alternatives(category, time_slot, is_weekend, holiday_name, fill)

    return {
        "title":           template["title"].format(**fill),
        "description":     template["description"].format(**fill),
        "discount_pct":    discount,
        "weather_context": weather_ctx,
        "alternatives":    alternatives,
        "source":          "template_fallback",
    }


def _build_fallback_alternatives(
    category: str,
    time_slot: str,
    is_weekend: bool,
    holiday_name: str | None,
    fill: dict,
) -> list[dict]:
    alts: list[dict] = []

    if holiday_name:
        alts.append({
            "title":          f"Feiertags-Deal bei {fill['name']} 🎉",
            "description":    f"{fill['discount']}% Rabatt – {holiday_name} feiern wir!",
            "context_reason": f"Heute: {holiday_name}",
        })

    if is_weekend and not holiday_name:
        alts.append({
            "title":          f"Wochenend-Special bei {fill['name']} 🌅",
            "description":    f"Gönn dir was – {fill['discount']}% nur am Wochenende!",
            "context_reason": "Wochenende",
        })

    slot_alts = {
        "morning": {
            "title":          f"Frühstücks-Deal bei {fill['name']} ☀️",
            "description":    "Starte den Tag mit einem leckeren Angebot!",
            "context_reason": "Morgen-Slot",
        },
        "lunch": {
            "title":          f"Lunch-Pause bei {fill['name']} 🍽️",
            "description":    f"{fill['discount']}% auf das Mittagsmenü – jetzt!",
            "context_reason": "Mittagszeit",
        },
        "afternoon": {
            "title":          f"Nachmittags-Snack bei {fill['name']} ☕",
            "description":    "Die perfekte Pause für zwischendurch!",
            "context_reason": "Nachmittag",
        },
        "feierabend": {
            "title":          f"Feierabend-Deal bei {fill['name']} 🍻",
            "description":    f"Den Tag ausklingen lassen – {fill['discount']}% jetzt!",
            "context_reason": "Feierabend",
        },
        "evening": {
            "title":          f"Abend-Highlight bei {fill['name']} 🌃",
            "description":    "Der perfekte Abend beginnt hier!",
            "context_reason": "Abendzeit",
        },
    }
    if time_slot in slot_alts and len(alts) < 2:
        alts.append(slot_alts[time_slot])

    return alts[:2]
