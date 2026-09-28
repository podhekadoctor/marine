# Marine Ecosystem Intelligence

A small web app that watches a stretch of coastline through two very different sets of eyes, a satellite and an underwater buoy, and then works out what to believe when they don't agree.

You pick a coastal zone, pick a scenario, and hit **Run investigation**. The app looks at what the satellite saw, what the buoy measured, decides how worried it should be, and tells you what to do next. There's also an **Explain these results** page that walks through everything in plain language.

---

## The idea

Coastal water problems, like harmful algae blooms and oxygen-starved "dead zones", are hard to judge from a single source.

- A **satellite** sees a huge area at once and can spot algae from space, but it can't see below the surface, and clouds can blind it.
- A **buoy** measures the water directly (oxygen, temperature, pH), but only at one tiny spot.

They often disagree. A satellite might see a big bloom at the surface while the buoy underneath reports perfectly healthy oxygen levels. Is one of them wrong?

Usually not. Blooms take time to die and rot, and it's the rotting that uses up the oxygen. So the surface can look alarming while the bottom hasn't felt it yet. This app is built around that kind of reasoning: don't throw either sensor away, work out why they differ, and decide what it means.

---

## What you can do in the app

- **Choose a monitoring sector** from the list, or click one on the map. The list and the map stay in sync.
- **See baseline conditions** for that sector: normal sea temperature, dissolved oxygen, chlorophyll-a, and the main risk being watched for.
- **Pick a telemetry scenario** from the dropdown (there are four, described below).
- **Run an investigation** and get:
  - an overall risk level (normal, moderate, high or critical) with a confidence percentage
  - a note when a human should double check the result
  - where the satellite and buoy disagreed, and how the disagreement was settled
  - what each sensor found, with its evidence
  - suggested next steps
- **Click "Explain these results"** for a separate page that explains every part of the result in plain English, including the raw numbers, the evidence for and against, the limits of the science, and a small glossary.
- **Read the "Did you know?" facts** in the sidebar, and scroll down the page for animated ocean stats and a gallery of facts.

---

## How it works

There are two programs that talk to each other: a Python backend that does the thinking, and a React frontend that shows it.

```
 Browser (React, port 5173)
        |
        |  POST /api/investigate  { zone, scenario, question }
        v
 Backend (FastAPI, port 8000)
        |
        |-- loads the chosen scenario's sample data (JSON files)
        |-- Satellite agent  -> looks at chlorophyll, temperature, cloud cover
        |-- Buoy agent       -> looks at oxygen, pH, temperature
        |-- Arbitrator       -> compares the two and writes the final verdict
        v
   Investigation record (findings, conflicts, assessment) -> back to the browser
```

### The two agents

Each agent takes its sensor's numbers and turns them into a **finding**: a headline, a severity, a confidence score, and a list of evidence.

**The satellite agent** compares surface chlorophyll-a and sea temperature against the zone's normal values.

| Situation | Severity |
| --- | --- |
| Chlorophyll 4x normal or more, or (chlorophyll 8+ and temperature 2 degrees above normal) | Critical |
| Chlorophyll 2x normal or more, or temperature 1.5 degrees above normal | High |
| Chlorophyll 1.3x normal or more | Moderate |
| Anything else | Normal |

Its confidence starts at 90% and drops when cloud cover is above 40%, because clouds make the optical readings less trustworthy. If there's no usable data at all, confidence falls to 20%.

**The buoy agent** looks at dissolved oxygen and pH.

| Situation | Severity |
| --- | --- |
| Oxygen 2.5 mg/L or lower, or pH below 7.5 | Critical |
| Oxygen 4.0 mg/L or lower | High |
| Oxygen 5.5 mg/L or lower | Moderate |
| Anything else | Normal |

Its confidence is 92%, or 25% if the probe sent nothing.

### The arbitrator

This is the part that decides what the two findings add up to. It checks four situations, in this order:

1. **A sensor didn't deliver.** If either agent's confidence is under 50%, the arbitrator refuses to guess. It flags the result for human review and suggests re-checking the sensors.
2. **Satellite alarmed, buoy calm.** The surface shows a bloom but oxygen at the bottom is fine. The arbitrator calls this a timing lag: the bloom is active but hasn't started using up oxygen yet. Result: **high risk**, with a warning to watch it closely.
3. **Both alarmed.** Both sensors agree something is badly wrong. Result: **critical risk**, with closure and aeration recommendations.
4. **Everything else.** Result: **normal**, keep monitoring as usual.

### The four scenarios

The data the app analyses comes from four sample datasets in `backend/app/data/scenarios/`. Each one is built to show off a different outcome.

| Scenario | What happens |
| --- | --- |
| Bay-17 Emerging Discrepancy | Satellite sees a bloom, buoy looks fine. The arbitrator explains the lag. |
| South Coast Acute Bloom & Deoxygenation | Both sensors are alarmed. Critical risk. |
| Low Confidence Incomplete Sensor Sweep | Heavy cloud cover and a dead oxygen probe. Human review requested. |
| Pelagic Deep Baseline Nominal | Everything normal. |

---

## Project layout

```
marine-ecosystem-intelligence/
|-- backend/
|   |-- app/
|   |   |-- main.py               # starts the FastAPI app, sets up CORS
|   |   |-- config.py             # reads settings from .env
|   |   |-- api/
|   |   |   |-- endpoints.py      # the API routes
|   |   |   `-- schemas.py        # the shape of requests and responses
|   |   |-- agents/
|   |   |   |-- satellite_agent.py
|   |   |   |-- buoy_agent.py
|   |   |   `-- arbitrator.py
|   |   |-- services/
|   |   |   `-- anomaly_detector.py   # the thresholds and scoring maths
|   |   `-- data/
|   |       |-- loader.py
|   |       |-- zones.json            # the three coastal zones
|   |       `-- scenarios/            # the four sample datasets
|   `-- requirements.txt
`-- frontend/
    |-- src/
    |   |-- App.tsx               # the main page and dashboard
    |   |-- components/
    |   |   |-- MarineMap.tsx     # the interactive map
    |   |   `-- ExplainPage.tsx   # the "explain these results" page
    |   |-- services/api.ts       # talks to the backend
    |   |-- types/api.ts          # TypeScript types for the data
    |   `-- index.css             # colours, animations, map styling
    `-- package.json
```

---

## Running it on your machine

You'll need **Python 3.12** and a recent **Node.js** (20.19 or newer). You'll run two terminals, one for each half.

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Mac / Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/health. If you see a small JSON message saying it's operational, the backend is running. Leave this terminal open.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the address it prints, usually http://localhost:5173.

The map tiles and the fonts are loaded from the internet, so you'll need a connection for those to appear.

---

## The API

If you'd like to poke at the backend directly, FastAPI also gives you interactive docs at http://localhost:8000/docs.

| Method | Route | What it does |
| --- | --- | --- |
| GET | `/health` | Checks the server is up |
| GET | `/api/zones` | Lists all coastal zones |
| GET | `/api/zones/{zone_id}` | One zone's details |
| GET | `/api/scenarios` | Lists the available scenarios |
| GET | `/api/scenarios/{scenario_id}` | The raw sensor data for a scenario |
| POST | `/api/investigate` | Runs an investigation |

An investigation request looks like this:

```json
{
  "zone_id": "zone-bay-17",
  "scenario_override": "conflicting_evidence",
  "question": "Is the bloom going to become a problem?"
}
```

---

## Settings

Settings live in `backend/.env` (start from `.env.example`):

| Setting | What it's for | Default |
| --- | --- | --- |
| `PORT` | Backend port | `8000` |
| `CORS_ORIGINS` | Which frontend addresses may call the backend | `localhost:5173` and `localhost:3000` |
| `GEMINI_API_KEY` | Gemini key, reserved for future use | empty |
| `GEMINI_MODEL` | Which Gemini model to use | `gemini-2.5-pro` |

Keep your `.env` out of version control (the included `.gitignore` already does this) and never paste a real key into `.env.example`.

---

## Things worth knowing

This is a demo, and I'd rather be upfront about what it does and doesn't do yet.

- **There's no AI model running inside the investigation.** The agents and the arbitrator follow fixed rules and thresholds, which makes their answers repeatable and easy to explain. Gemini is set up in the settings and the dependency list, but nothing in the investigation calls it yet. The `rag/` and `workflows/` folders are empty placeholders for that future work.
- **The scenario drives the result, not the zone.** The numbers come from the scenario you pick. The zone you select affects the map and the baseline panel, but doesn't change the analysis. Each scenario is written for one specific zone, so it makes the most sense to pair them up.
- **The question box isn't used in the analysis yet.** What you type is saved with the investigation and shown on the explain page, but it doesn't change the result.
- **The data is sample data.** These are hand-written datasets, not live satellite or buoy feeds.
- **One gap in the arbitrator.** If the buoy raises an alarm but the satellite looks normal, none of the four cases match, so the result falls through to "normal". A real system would want a case for that.
- **The confidence numbers for the final verdict are fixed** (86%, 95% and 92% for the three main outcomes), not calculated from the sensors. The per-sensor confidences are calculated.
- **The text on the explain page is written into the frontend.** It's filled in with each investigation's real numbers, but the descriptions of terms and severity levels are fixed wording.

---

## Ideas for what to build next

- Actually use Gemini to write a natural-language briefing, or to answer the question typed into the question box.
- Let the zone choose the data, so each sector has its own scenarios.
- Add the missing arbitrator case for a lone buoy alarm.
- Keep a history of past investigations you can reopen and compare.
- Export an investigation as a PDF report.
- Plug in real data sources instead of the sample files.
