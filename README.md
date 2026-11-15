# PULSAR AHM — Astronaut Health Monitoring

NASA Space Apps 2026. A health-monitoring console for a long-duration crew: one public home page, three role dashboards, and a watch. The interface is in French and English. Every medical number on screen is fictional and marked **DEMO**. The screens support a decision; they do not make a diagnosis.

The repository holds the front end (`frontend/`) and the ship server (`backend/`, FastAPI). Heart-rate forecasts use **XGBoost, an LSTM, and Prophet** on the demo series. The other indicators stay a written scenario. If the API does not answer, the browser switches to the same scenario locally.

## Roles

| Role | Opens as | Route | Sees |
|---|---|---|---|
| **Astronaut** | Lina Kovacs (`AST-001`) | `/astronaute` | her own data, tablet, watch, and kits |
| **Crew surgeon** | Dr Nolan Okafor (`CMO-001`) | `/medecin-bord` | the whole crew |
| **NASA Houston** | Dr Maya Chen (`NASA-FS-001`) | `/nasa` | reports received over the satellite link |

`/` is a public home page (what PULSAR is, how a reading travels from the watch to Houston, an interactive watch). **Sign in** (`/connexion`) is three buttons: Astronaut, Crew surgeon, Houston. Each button opens that role. There is no identifier form and no account list on screen.

## What is on screen

### Astronaut

- **Home.** Pulse, SpO₂, temperature, blood pressure, and sleep as dials. A 3D body highlights the zone that needs attention. A clinical-assist card points to the forecast. A regularity strip appears when goals are on.
- **Silhouette.** The same body, with zone detail.
- **Forecasts.** Observed line, dashed forecast, and a confidence band for heart rate. Drift, risk, and time-to-threshold in plain language, plus proposed actions.
- **Face scan.** The laptop camera frames the face locally. The picture is never stored and never sent. Eyelid closure, blink rate, and fatigue level come from a clock-based wave (`scanSim`).
- **Kits.** Glucose (fasting 70–99 mg/dL, or after a meal), blood pressure, temperature (°C), and mood (1 to 5). Each card shows a Nominal / Caution / Warning lamp, the action to take, and a line in the device log. Saving a kit also counts toward the day’s regularity.
- **Wellbeing.** Timed sessions: 4-4 breathing, sleep routine, ARED resistance, mindfulness, and a family-call window.
- **Goals and settings.** Streaks and badges from regularity only (measurements done, routines followed). No health value, no ranking. The whole layer can be switched off.
- **Arm mode (EVA).** Four large targets for gloved use.
- **Day routine.** Timed reminders that jump to the matching kit, scan, or session.

### Watch

The watch page no longer searches for a Bluetooth device. It treats an **ESP32-C3 on Wi-Fi** as already linked (`ESP32-C3 · Wi-Fi`).

1. **Fingerprint.** The page asks for this PC’s fingerprint reader (Windows Hello, through the dev server). A recognized print opens the follow-up and fires a strong buzz on the ESP32 buzzer (`ESP_BUZZER_IP`). Automated tests skip the reader.
2. **Live follow-up.** Pulse and SpO₂, plus the radiation dosimeter, use the ship server when it answers and the local simulator otherwise. Sleep, the sync log, and the on-watch faces stay scripted.
3. **Two faces you can tap.** A square face, 198×242 (watchOS), and a round face, 454×454 (Wear OS). The square face opens on the dial; the round face opens on the orange alert. Tapping the pulse opens the mini silhouette; tapping the alert opens the one-minute breathing screen.
4. **All nine screens.** `/astronaute/montre/ecrans` shows both shapes, frozen, for: dial, mini silhouette, orange alert, red alert, measurement reminder, breathing, tablet sync, offline, and the goals complication.

The scripted watch story matches Lina Kovacs: resting pulse **94 bpm**, up over 3 days, sleep **5 h 10**, caution on heart and sleep, lungs nominal (SpO₂ 97). The goals complication shows her streak and the crew goal when gamification is on (gallery default: 12 days, crew 70%). The home page embeds the same square face.

### Crew surgeon

- Crew lamps and each astronaut’s file, with the live pulse / SpO₂ and radiation charts.
- Forecasts per crew member, with the surgeon’s inspector: validate, replace, or escalate a proposed action.
- Guided ultrasound in six steps (probe, zone, placement, live image, annotation, send). Heart and eye images are drawn in the page; they are not a probe stream.
- A journal of what was recorded on this device.
- Space-weather card (DONKI reference, not a crew measurement). Source reads Connected, Cache, or Offline.

### NASA Houston

- Inbox of reports, including the red-alert report.
- A reply drafted for the next uplink.
- Link windows.
- The forecast summary and the ultrasound still travel with the report. Houston reviews them; it does not edit the crew file.

### Shared

- **Workflow** on alerts, actions, and reports: New, Seen, In progress, Resolved, Escalated, plus an owner.
- **Time window** (live or fixed) and a latest-value table on the dense telemetry views.
- **Themes:** dark (“space”) and light (“clinical white”).
- **Alarms** follow IEC 60601-1-8, synthesized in the browser. A red alarm can be paused for 2 minutes only after it has been seen. Sound always has a visual signal.
- **Offline build:** fonts, scripts, and icons are local. The production build does not call the Internet.

## Simulations

The crew is **Artemis VI, mission day 127**. Four people, all fictional:

| Id | Name | Role | Story used on screen |
|---|---|---|---|
| `LK` | Lina Kovacs | Flight engineer | Caution. Resting pulse about 94 bpm for 3 days, sleep 5 h 10, moderate fatigue. This is the astronaut you enter as, and the watch story. |
| `AM` | Alex Morgan | Commander | Nominal. A past South Atlantic Anomaly pass sits in the alert list as resolved. |
| `NO` | Nolan Okafor | Scientist and crew surgeon | Nominal. Also the surgeon account. |
| `SR` | Sofia Reyes | Pilot | Nominal now. A past SpO₂ alert (91% for 4 min) is in the list as resolved. |

| What moves on screen | How it is produced | Where it is used |
|---|---|---|
| Pulse, SpO₂, skin temperature, HRV, drift, radiation | Deterministic wave plus stable noise, one baseline per crew member. A short radiation spike stands in for a South Atlantic Anomaly pass. Cumulative dose grows from mission start (10 July 2026). | Home dials, watch charts, surgeon file. Refresh about every 2 s. |
| Heart-rate forecast | The same three models as the server: XGBoost, a seasonal LSTM, and Prophet, fit on that demo series. Observed line, three dashed forecasts, one interval. | Astronaut and surgeon forecast pages, live heart-rate chart. |
| Other forecasts (SpO₂, pressure, temperature, glucose, sleep, radiation) | A fixed scenario with a drift score, a risk word, and a time-to-threshold. Glucose stays on the high side of its band because the scenario has no meal context. | Forecast panels and the NASA report summary. |
| Alerts | Four scripted alerts (Lina’s pulse and drift, Sofia’s resolved SpO₂, Alex’s resolved radiation pass), with workflow state and an owner. | Boards, journal, NASA inbox. |
| Face-scan rates | A sine wave on the clock: eyelid closure and blinks per minute, then a fatigue word (low / moderate / high). The camera image only frames the face. | Face scan. |
| Watch faces | Fixed frames and tap targets, not the live series. Sleep bars, “tablet synced 2 min ago”, “41 readings kept on the watch”, and the 94 bpm caution are part of that frame. | Watch page, watch gallery, home page. |
| Watch link | No radio scan. The page assumes the ESP32-C3 Wi-Fi link, then waits for the PC fingerprint before showing charts. | `/astronaute/montre` |
| Kits and mood | The astronaut types the reader value. Lamps use the cabin thresholds. The line is stored on this device. | Kits. |
| Ultrasound | An SVG sector (heart or eye) with depth, gain, and an optional caliper. | Surgeon echo steps and the Houston still. |
| Regularity | Preset streaks and today’s completed measures, then whatever you check off in this browser (`localStorage`). | Goals, home strip, watch complication, surgeon participation. |
| Sign-in | A session in the browser (12 h). One canonical account per role. | `/connexion` |
| Space weather | The server calls DONKI, then a cache, then a local file. The browser never holds the NASA key. | Watch and surgeon board. |

`VITE_USE_MOCK=true` forces the local simulator. With the default (`false`), the front end calls `http://localhost:8000` and falls back to the simulator if that call fails, then retries the API every 30 s. The on-screen chip reads **API connected** or **Simulator**.

## Install and run

Node.js 20.19 or newer, and Python 3.12 for the ship server.

Front end (PowerShell):

```powershell
cd C:\PULSAR-PROJECT\frontend
npm i
npm run dev
```

Open http://localhost:5173.

Ship server, in a second terminal:

```powershell
cd C:\PULSAR-PROJECT\backend
python -m pip install -r requirements.txt
python -m app.seed
python -m uvicorn app.main:app --port 8000
```

Optional: copy `frontend/.env.example` to `frontend/.env`.

| Variable | Default | Role |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | FastAPI base URL |
| `VITE_USE_MOCK` | `false` | `true` keeps the browser on the local simulator |
| `VITE_AUTH_API_URL` | empty | empty = the demo session above; a URL = `POST /auth/login` |
| `VITE_DEV_TOOLS` | empty | dev pages inside a production build |
| `ESP_BUZZER_IP` | `192.168.137.11` | ESP32-C3 buzzer, read only by the dev server |

From `frontend/`: `npm run typecheck`, `npm run build` then `npm run preview` (http://localhost:4173), and `npm run test:e2e` after `npm run test:e2e:install` once. Playwright forces the simulator.

## Demo accounts

These codes are not shown in the interface. Choosing a role opens the first account of that role. The other crew members exist in the simulator and on the surgeon board.

| Identifier | Code | Role | Name |
|---|---|---|---|
| `AST-001` | `482105` | Astronaut | Lina Kovacs |
| `AST-002` | `130742` | Astronaut | Alex Morgan |
| `AST-003` | `559031` | Astronaut | Nolan Okafor |
| `AST-004` | `246813` | Astronaut | Sofia Reyes |
| `CMO-001` | `731406` | Crew surgeon | Dr Nolan Okafor |
| `NASA-FS-001` | `905218` | NASA Houston | Dr Maya Chen |
| `NASA-FS-002` | `618847` | NASA Houston | Dr Daniel Brooks |

Ship-server demo keys (SHA-256 only, never sent by the browser): `demo-key-watch-lk`, `demo-key-kit-lk`, `demo-key-cmo`. The front end sends `X-User-Id` from the open session.

## Layout

```
PULSAR-PROJECT/
├─ README.md
├─ AGENTS.md
├─ frontend/          React 19, Vite, TypeScript, Tailwind 4
│  └─ src/
│     ├─ app/         router and the shared shell
│     ├─ api/         HTTP client, simulator, forecast fallback
│     ├─ features/    landing, auth, astronaut, surgeon, NASA, watch, forecasts, goals, sound
│     ├─ components/  UI, charts, telemetry, 3D body
│     └─ data/demo/   crew, accounts, thresholds
└─ backend/           FastAPI ship server
```

Stack: React 19, Vite 8, TypeScript (strict), Tailwind CSS 4 on the design tokens, TanStack React Query, Recharts, lucide-react, Motion, three.js, react-router, Playwright. Server: FastAPI.

Design reference: [PULSAR AHM v6 on Figma](https://www.figma.com/design/cj96CiSofo2y0mDSpre7J1). Remote: https://github.com/kevinleboss499-code/PULSAR.git (`kevin/pulsar`).

## Credits

- Fonts: Space Grotesk and IBM Plex (SIL OFL 1.1). Icons: lucide (ISC). Charts: Recharts (MIT).
- 3D silhouette: MakeHuman base mesh, CC0 1.0 (`frontend/public/body3d/LICENSE.md`).
- Photos: NASA, public domain.
- Alarm tones: synthesized in the browser (Web Audio). No audio files.
