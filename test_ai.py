import json
from ai_service import generate_offer_text

merchant = {
    "id": "m_1",
    "name": "Eiscafe Venezia",
    "category": "ice_cream",
    "limits": {"max_discount_pct": 20}
}
context = {
    "temperature": 25,
    "weather_code": 0,
    "time_slot": "lunch",
    "is_weekend": False,
    "holiday_name": None,
    "weekday_name": "Mittwoch"
}

res = generate_offer_text(merchant, context)
print(json.dumps(res, indent=2))
