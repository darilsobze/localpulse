# LocalPulse – Tech Pitch (1 Minute)

Hier ist ein Skript für ein 1-minütiges technisches Erklärvideo (ca. 140 Wörter, ideal für 60 Sekunden Sprechzeit) sowie Vorschläge für die passenden visuellen Einblendungen.

## 🎤 Das Skript (Sprechertext)

**[00:00 - 00:10] Tech Stack & Intro**
"Willkommen zum technischen Deep Dive von LocalPulse. Unser Stack ist auf maximale Performance und Leichtigkeit ausgelegt: Wir nutzen ein asynchrones **FastAPI**-Backend in Python, **SQLite** als schnelle Datenbank und ein Frontend aus purem Vanilla JavaScript, angetrieben von einer 60fps **Mapbox 3D-Engine**."

**[00:10 - 00:25] Architektur & Privacy by Design**
"Architektonisch steht 'Privacy by Design' an erster Stelle. Das Smartphone fungiert als intelligenter Edge Node. Unsere clientseitige *ContextEngine* analysiert GPS-Bewegungsmuster lokal im RAM und sendet **niemals** Standortdaten an den Server. Stattdessen übertragen wir nur abstrakte Signale wie den sogenannten 'Vibe State' – zum Beispiel 'gestresst' oder 'entspannt'."

**[00:25 - 00:45] Context Layering & KI-Implementierung**
"Auf unserem DSGVO-konformen Server kombinieren wir diese Signale mit externen Layern: Echtzeit-Wetter, lokale Events und simulierte Payone-Transaktionsdaten, um die ruhigen Phasen der Händler zu erkennen. All das fließt in einen dynamischen Prompt für **Gemma 4 2B**. Die KI generiert in Millisekunden einen hyperpersonalisierten Angebotstext, der sich tonal exakt an die aktuelle Stimmung und Schrittfrequenz des Nutzers anpasst."

**[00:45 - 01:00] Checkout & Abschluss**
"Die nahtlose Implementierung des Checkouts rundet das System ab: Ein dynamisch generierter QR-Code mit Token-Validierung sorgt für eine sichere Einlösung direkt am Point of Sale. LocalPulse: Kontextsensitiv, KI-gesteuert und 100% datenschutzfreundlich."

---

## 🎬 Vorschläge für Bilder & B-Roll (Visuals)

Passend zu den Abschnitten im Skript solltest du folgende Visuals einblenden:

| Sekunde | Bild / Video-Idee | Erklärung |
| :--- | :--- | :--- |
| **00:00** | **Logos & UI** | Blende kurz die Logos des Stacks ein (FastAPI, Python, Mapbox, OpenAI, SQLite) und zeige ein kurzes Screen-Recording der geschmeidigen 3D-Kartenanimation im Hintergrund. |
| **00:10** | **Edge Node vs. Server Diagramm** | Zeige eine vereinfachte Grafik, wie das Handy die GPS-Daten *behält* (durchgestrichenes GPS-Symbol in Richtung Server) und stattdessen nur eine kleine JSON (`{vibe: "post_errand"}`) an die API schickt. |
| **00:25** | **Prompt-Trichter (Funnel)** | Ein animierter Trichter oder ein Plus-Rechnung-Bild: `User Vibe` + `Wetter` + `Payone Demand` ➡️ `Gemma 4 2B`. Hier kannst du super Teile aus dem Mermaid-Diagramm (*Hyperpersonalization Flow*) verwenden! |
| **00:35** | **JSON Code-Snippet** | Zeige ganz kurz, wie der Server-Response aussieht (ein schönes JSON-Objekt mit `title`, `description` und `discount_pct`), um die technische Tiefe zu unterstreichen. |
| **00:45** | **QR-Code Flow** | Screen-Recording der App: Der Moment, in dem das Angebot akzeptiert wird, der Fly-To auf der 3D Karte passiert und der QR-Code generiert wird. |
