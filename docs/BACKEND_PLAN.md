# LocalPulse AI Engine (Backend)

Ziel ist es, das "Gehirn" der LocalPulse-App zu bauen. Während das Mobile UI den Kontext sammelt und die 3D-Karte anzeigt, ist das Backend für die intelligenten Trigger und die Generierung der Angebote zuständig.

## Architektur

Wir nutzen einen leichtgewichtigen Python-Server mit **FastAPI**, der als API für das Mobile UI dient.

### Backend Komponenten

1. **`main.py`**:
   - Setup des FastAPI Webservers.
   - API Endpoint `POST /api/offer`, an den das Mobile UI den aktuellen Kontext (Wetter, Koordinaten) sendet.

2. **`payone_mock.py`**:
   - Der "Unfair Advantage" für den DSV Hackathon.
   - Ein Modul, das für lokale Händler eine aktuelle Transaktionsdichte simuliert.
   - Liefert das Signal, wenn ein Händler eine unerwartete "Flaute" hat.

3. **`ai_service.py`**:
   - Die Generative AI Integration (vorerst simuliert, kann später einfach mit echter API ersetzt werden).
   - Nimmt den Kontext (30°C, Nutzer in der Nähe) und die Händler-Situation (Flaute) und generiert daraus einen hyperpersonalisierten Text.

4. **`data/merchants.json`**:
   - Eine kleine Dummy-Datenbank mit fiktiven Shops in Darmstadt und deren "Leitplanken" (z.B. Ziel: Flauten füllen, Limit: max 20% Rabatt).
