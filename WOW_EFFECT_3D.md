# The LocalPulse "WOW-Effect" 🌟
**Immersive 3D Maps & Generative UI Transitions**

Dieses Dokument beschreibt die technische und konzeptionelle Umsetzung unseres "WOW-Effekts". Ziel ist es, die klassische, statische User Experience ("Hier ist ein Coupon") durch ein immersives, gamifiziertes Erlebnis zu ersetzen.

---

## 🎯 Das Konzept

Der WOW-Effekt triggert genau in dem Moment, in dem der Nutzer das dynamisch generierte Angebot (GenUI) akzeptiert. 

1. **Der Ausgangszustand:** Der Nutzer sieht ein cleanes, schwebendes Widget (GenUI) mit einem Countdown und einem attraktiven Visual.
2. **Die Morphing-Phase:** Beim Klick auf "Angebot annehmen" verschwindet das UI nicht einfach. Die Karte im Hintergrund wird aktiv.
3. **Der Kameraflug:** Die Perspektive wechselt von einer flachen 2D-Ansicht in einen dramatischen, geneigten 3D-Flug (Pitch & Bearing) auf das Zielgebäude (den lokalen Händler).
4. **Social Proof (FOMO):** Es tauchen animierte Marker auf der Karte auf, die andere Nutzer der City Wallet repräsentieren, die gerade dasselbe Angebot wahrnehmen.

---

## 🛠️ Technische Umsetzung (Tech Stack)

Wir nutzen **Mapbox GL JS** für das Rendering der 3D-Elemente im Browser. Es bietet Hardware-Beschleunigung (WebGL) und flüssige 60fps-Animationen auch auf mobilen Geräten.

### 1. Die 3D-Stadtlandschaft
Mapbox ermöglicht es, Gebäude-Layer (`fill-extrusion`) mit echten Höhendaten zu rendern. Wir nutzen ein stylisches, dunkles Kartendesign (`dark-v11`), um die Farben des UIs und der Marker besonders leuchten zu lassen (Cyberpunk/Neon-Ästhetik).

### 2. Camera Controls (FlyTo)
Der nahtlose Übergang in die 3D-Welt wird durch die `flyTo`-Methode von Mapbox realisiert.
Beispielhafte Parameter:
*   `zoom`: ~17.5 (Tief ins Straßenniveau eintauchen)
*   `pitch`: ~65 Grad (Für den 3D-Effekt)
*   `bearing`: ~ -20 Grad (Eine leichte Kameradrehung für mehr Dynamik)

### 3. Social Proof Animationen
Anstatt statischer Pins verwenden wir **pulsierende CSS-Animationen**, die wir an geografische Koordinaten (Lng/Lat) binden. 
*   **Optik:** Kleine, leuchtende Kreise (z.B. in Cyan `#00ffcc`), die einen starken Kontrast zum Dark-Mode-Hintergrund bilden.
*   **Logik:** Die Marker ploppen asynchron (mit leichtem Delay) in den Nebenstraßen um das Ziel herum auf. Das suggeriert Live-Aktivität und Bewegung.

---

## 🏃‍♂️ Den Prototypen ausführen

Wir haben einen funktionalen Prototypen gebaut, der diesen Effekt in einer reinen HTML/JS-Umgebung demonstriert.

1. Besorge dir einen kostenlosen API-Token von [Mapbox](https://www.mapbox.com/).
2. Öffne die Datei `demo_3d_map.html` im Code-Editor.
3. Trage deinen Token in der Zeile `mapboxgl.accessToken = '...';` ein.
4. Öffne die HTML-Datei im Browser.
5. Klicke auf den "Angebot annehmen"-Button und erlebe den Kameraflug und den Social Proof!
