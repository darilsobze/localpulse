# LocalPulse – Tech Pitch (1 Minute)

Here is the script for a 1-minute technical explainer video (approx. 140 words, ideal for 60 seconds of speaking time), along with suggestions for visual overlays.

## 🎤 The Script (Voiceover)

**[00:00 - 00:10] Tech Stack & Intro**
"Welcome to the LocalPulse technical deep dive. Our stack is built for maximum performance and a lightweight footprint: an asynchronous **FastAPI** backend in Python, **SQLite** for fast persistence, and a pure Vanilla JavaScript frontend powered by a 60fps **Mapbox 3D engine**."

**[00:10 - 00:25] Architecture & Privacy by Design**
"Architecturally, 'Privacy by Design' comes first. The smartphone acts as an intelligent edge node. Our client-side *ContextEngine* analyzes GPS movement patterns locally in RAM and **never** sends raw location data to the server. Instead, we only transmit abstract signals like the user's 'Vibe State'—for example, 'rushed' or 'lingering'."

**[00:25 - 00:45] Context Layering & AI Implementation**
"On our GDPR-compliant server, we layer these signals with real-time weather, local events, and simulated Payone transaction density to detect quiet merchant hours. All this context merges into a dynamic prompt for **Gemma 4 2B**. In milliseconds, the AI generates a hyper-personalized offer text that perfectly matches the user's exact mood and walking pace."

**[00:45 - 01:00] Checkout & Conclusion**
"Finally, the seamless checkout implementation closes the loop: a dynamically generated QR code ensures a secure redemption directly at the point of sale. LocalPulse: context-aware, AI-driven, and 100% privacy-first."

---

## 🎬 Suggestions for Images & B-Roll (Visuals)

You should use the following visuals to match the sections in the script:

| Timestamp | Image / Video Idea | Explanation |
| :--- | :--- | :--- |
| **00:00** | **Logos & UI** | Briefly flash the tech stack logos (FastAPI, Python, Mapbox, OpenAI, SQLite) over a short screen recording of the smooth 3D map animation in the background. |
| **00:10** | **Edge Node vs. Server Diagram** | Show a simplified graphic of how the phone *keeps* the GPS data (a crossed-out GPS symbol pointing to the server) and instead only sends a tiny JSON payload (`{vibe: "post_errand"}`) to the API. |
| **00:25** | **Prompt Funnel** | An animated funnel or equation: `User Vibe` + `Weather` + `Payone Demand` ➡️ `Gemma 4 2B`. You can easily use parts of the Mermaid diagram (*Hyperpersonalization Flow*) here! |
| **00:35** | **JSON Code Snippet** | Very briefly flash how the server response looks (a clean JSON object with `title`, `description`, and `discount_pct`) to emphasize the technical depth. |
| **00:45** | **QR Code Flow** | App screen recording: the moment the offer is accepted, the 3D fly-to effect on the map, and the generated QR code appearing on screen. |
