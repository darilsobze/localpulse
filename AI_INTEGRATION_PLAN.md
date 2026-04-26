# 🤖 KI-Integration in LocalPulse (OpenAI API)

## Status: ✅ Implementiert

Die KI-Integration ist vollständig in `ai_service.py` umgesetzt.

---

## Architektur-Entscheidung: Gemma 4 2B (Privacy-First)
Wir nutzen **Gemma 4 2B** lokal, da das Modell on-premise läuft und keinerlei Nutzerdaten das Rechenzentrum verlassen:
- **Privacy by Design** – Kein API-Call zu einem Drittanbieter. Alle Inferenz bleibt auf dem deutschen Server.
- **Zuverlässiges JSON** – Wir nutzen `response_format={"type": "json_schema"}`, um sauberes JSON (`{title, description}`) zu erzwingen.
- **Robustes Fallback** – Ein lokales Template-System springt nahtlos ein, falls das Modell nicht verfügbar ist oder offline demonstriert werden muss.

---

## 🛠️ Setup (einmalig)

### Schritt 1: OPENAI_API_KEY besorgen
1. Account anlegen auf [platform.openai.com](https://platform.openai.com/)
2. API Key erstellen
3. In `.env` eintragen:
   ```
   OPENAI_API_KEY=sk-proj-...
   ```

### Schritt 2: Dependencies installieren
```bash
pip install -r requirements.txt
```
Installiert: `fastapi`, `uvicorn`, `pydantic`, `openai`, `python-dotenv`

### Schritt 3: Server starten
```bash
uvicorn main:app --reload --port 8000
```

### Schritt 4: Testen
Swagger UI: http://127.0.0.1:8000/docs

`POST /api/offer` mit:
```json
{
  "user_lng": 8.6535,
  "user_lat": 49.874,
  "temperature": 32,
  "weather_code": 0,
  "radius_m": 1000
}
```

Antwort ohne Key → `"source": "template_fallback"`  
Antwort mit Key  → `"source": "openai"`

---

## 🏗️ Architektur (`ai_service.py`)

| Komponente | Detail |
|---|---|
| Modell | `gemma-4-2b` – schnell & kosteneffizient |
| Structured Output | JSON Schema (`strict: True`) → garantiert valides JSON |
| System-Prompt | Marketing-Experte, deutsche Texte, max. 3s Lesedauer |
| Wetter-Mapping | WMO-Codes → `heiss_sonnig`, `warm`, `regen`, `kalt`, `schnee` |
| Fallback | 15 Template-Kombinationen (Kategorie × Wetterlage) |

### Generierungsflow
```
Händlerdaten + Wetter + Rabatt
        ↓
OpenAI gemma-4-2b
        ↓
{ "title": "≤50 Zeichen", "description": "≤80 Zeichen" }
        ↓
Mobile App Gen-UI-Widget
```
