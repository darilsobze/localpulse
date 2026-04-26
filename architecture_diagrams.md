# LocalPulse System Architecture

## 1. Creativity of the Model Architecture
The LocalPulse architecture is designed with **Privacy by Design** at its core. Instead of sending raw GPS data to the server, the user's device acts as an intelligent edge node. The client-side `ContextEngine` processes movement patterns and only sends abstract behavioral signals (like `vibe_state` and `pace_class`) to the backend. The backend then layers this with external context (weather, real-time merchant demand, and events) to construct a vibe-aware prompt for the Generative AI. 

```mermaid
flowchart TB
    subgraph Client ["📱 User's Device (Edge Node - Privacy First)"]
        GPS["📍 GPS Stream (Local RAM Only)"] --> CE["🧠 ContextEngine (JS)"]
        CE -->|"Computes pace, dwell, direction variance"| IS["📊 IntentSignal<br/>(vibe_state, pace, receptivity)"]
        
        UI["🎨 Frontend (Vanilla JS)"]
        Map["🗺️ Mapbox 3D Map & Animations"]
        UI --- Map
    end

    IS -- "HTTPS (No raw GPS or History sent)" --> API{"⚡ FastAPI Gateway"}

    subgraph Backend ["☁️ LocalPulse Server (Germany - DSGVO)"]
        API --> M1
        
        subgraph M1 ["Layer 1: Context Sensing"]
            W["☁️ Weather (Open-Meteo)"]
            P["💳 Payone Demand (Detects Quiet periods)"]
            E["📅 Local Events & Time"]
        end

        M1 --> M2

        subgraph M2 ["Layer 2: Generative Offer Engine"]
            VAP["📝 Vibe-Aware Prompt Builder"]
            GPT["🤖 Gemma 4 2B (LLM)"]
            TMP["📋 Vibe-Aware Template Fallback"]
            
            VAP --> GPT
            VAP -. "Fallback if no API Key" .-> TMP
        end

        GPT --> RES["✨ Hyper-personalized JSON Offer"]
        TMP --> RES

        subgraph M3 ["Layer 3: Checkout & Wallet"]
            RED["✅ Dynamic QR Redemption"]
            WAL["💰 Cashback Wallet System"]
            DB[("🗄️ SQLite (localpulse.db)")]
            
            RED --> DB
            WAL --> DB
        end
    end

    RES -- "HTTPS Response" --> UI
    UI -- "Accepts Offer & Scans QR" --> RED
```

## 2. Hyperpersonalization Flow
The true magic of LocalPulse lies in its hyperpersonalization. It doesn't just offer generic discounts; it dynamically adjusts the **tone, urgency, and length** of the offer based on the user's inferred state of mind (`vibe_state`). A user in a rush gets a short, punchy copy emphasizing speed, while a lingering user gets an invitation to relax.

```mermaid
flowchart LR
    subgraph OnDevice ["1. On-Device Sensing (Client)"]
        direction TB
        History["GPS Ring Buffer (6h)<br/>+ Detail Window (30min)"] --> Calc["Pace & Variance Algorithm"]
        Calc -->|"Pace > 1.5 m/s"| V1["🏃 Commuting<br/>(Rec: 22%)"]
        Calc -->|"Pace drops from high"| V2["🛍️ Post-Errand<br/>(Rec: 80%)"]
        Calc -->|"Pace 0.8-1.5 m/s"| V3["🚶 Strolling<br/>(Rec: 58%)"]
        Calc -->|"High Variance, < 0.8 m/s"| V4["👀 Exploring<br/>(Rec: 75%)"]
        Calc -->|"Stationary / Dwell"| V5["☕ Lingering<br/>(Rec: 93%)"]
        
        V1 & V2 & V3 & V4 & V5 --> VS["IntentSignal:<br/>vibe_state"]
    end

    subgraph ServerContext ["2. Context Layering (Server)"]
        direction TB
        VS --> Merge(("Context<br/>Merge"))
        Weather["🌡️ Weather (e.g. 28°C Sunny)"] --> Merge
        Time["⏰ Time & Calendar (Weekend)"] --> Merge
        Demand["📉 Merchant Demand (Low Traffic)"] --> Merge
    end

    subgraph AIGen ["3. Generative AI Engine"]
        direction TB
        Merge --> Prompt["Prompt Construction"]
        
        Prompt --> Tone["Tone & Urgency Selection"]
        Tone -- "Commuting" --> T1["Tone: Ultra-short, Urgent<br/>Format: QR-first, <30s"]
        Tone -- "Post-Errand" --> T2["Tone: Rewarding, Euphoric<br/>Format: 'You earned it'"]
        Tone -- "Lingering" --> T3["Tone: Inviting, Relaxed<br/>Format: Full Experience"]
        
        T1 & T2 & T3 --> LLM["Gemma 4 2B generation"]
        LLM --> Output["Hyper-personalized Output<br/>Title, Description, Alternatives"]
    end

    OnDevice --> ServerContext
    ServerContext --> AIGen
    Output --> FinalUI["📱 Push Notification<br/>& Animated 3D Offer Card"]
```
