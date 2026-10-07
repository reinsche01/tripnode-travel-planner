# ✈️ TripNode — Hybrid AI Travel Planner

> **Plan Smarter. Travel Better.**
> An AI-powered travel itinerary builder that uses your hotel as a gravity center, locks in your must-visit events, and fills the gaps intelligently.

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org)

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| 🏨 **Hotel as Gravity Center** | AI only suggests places near your accommodation — no wasteful cross-city detours |
| 🔒 **Contextual Fill-the-Blank** | Lock concerts, restaurants, bookings. AI fills only the empty slots |
| ⏰ **Real-Time Hours Validation** | Google Places API checks if venues are actually open before recommending |
| 🗺️ **Free Route Optimization** | OSRM calculates driving distances at no cost |
| 🧩 **Drag & Drop Timeline** | Rearrange your day like puzzle pieces |
| 📄 **PDF Export** | Download a print-ready itinerary |
| 🔗 **Share Links** | Collaborate via a public read-only link |

---

## 🏗️ Tech Stack

```
Frontend   → React 18 + Vite + Tailwind CSS + dnd-kit + Zustand
Backend    → Node.js + Express.js
Database   → Supabase (PostgreSQL) + Auth
AI         → Google Gemini 3.5 Flash Lite (Structured JSON Output)
Places     → Google Places API (with Supabase caching)
Routing    → OSRM (Open Source Routing Machine — free)
PDF        → jsPDF (client-side)
```

---

## 📁 Project Structure

```
tripnode/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry point
│   │   ├── routes/               # auth.js, trips.js, places.js, routes.js
│   │   ├── services/             # geminiService.js, placesService.js, osrmService.js
│   │   ├── middleware/           # auth.js, errorHandler.js, rateLimiter.js
│   │   └── utils/                # supabaseClient.js
│   ├── db/
│   │   └── migrations/
│   │       └── 001_initial_schema.sql  # Full schema (all tables, RLS, triggers)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/                # LandingPage, LoginPage, SignupPage,
│   │   │                         # DashboardPage, TripWizardPage,
│   │   │                         # TripPlannerPage, SharedTripPage
│   │   ├── components/
│   │   │   ├── timeline/         # Timeline.jsx, TimelineItem.jsx
│   │   │   ├── trip/             # EditItemModal.jsx, AddAnchorModal.jsx
│   │   │   └── ui/               # Toast.jsx, Skeleton.jsx
│   │   ├── store/                # authStore.js, tripStore.js, uiStore.js (Zustand)
│   │   ├── services/             # api.js, supabaseClient.js
│   │   └── utils/                # pdfExport.js (client-side PDF via jsPDF)
│   ├── public/                   # favicon.svg
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── backend-features.md
│   └── frontend-features.md
│
├── worksteps.md                  # Development workflow & deployment guide
├── preparation.md                # API keys & service setup guide
└── .gitignore
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/tripnode.git
cd tripnode

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# → Fill in: SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_PLACES_API_KEY,
#            GOOGLE_GEMINI_API_KEY, JWT_SECRET

# Frontend
cd ../frontend
cp .env.example .env
# → Fill in: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
```

### 3. Set Up Supabase Database

In Supabase dashboard → SQL Editor, run the following script:

```
backend/db/migrations/001_initial_schema.sql
```
This file creates all tables, RLS policies, indexes, and triggers in one shot.

### 4. Run Locally

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# → http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:5173
```

---

## 🔑 Required API Keys

| Service | Env Variable | Where to Get | Used For |
|---------|-------------|-------------|---------|
| **Supabase** | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` | [supabase.com](https://supabase.com) | DB + Auth |
| **Google Gemini** | `GOOGLE_GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) | AI itinerary generation |
| **Google Places** | `GOOGLE_PLACES_API_KEY` | [console.cloud.google.com](https://console.cloud.google.com) | Place data + geocoding |
| **OSRM** | *(none)* | Free public server | Route distances (no key needed) |

See [`preparation.md`](./preparation.md) for step-by-step API key acquisition.

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [`worksteps.md`](./worksteps.md) | Full development workflow & deployment guide |
| [`preparation.md`](./preparation.md) | API keys & service setup |
| [`docs/architecture.md`](./docs/architecture.md) | System architecture & data flow |
| [`docs/backend-features.md`](./docs/backend-features.md) | API endpoints & services |
| [`docs/frontend-features.md`](./docs/frontend-features.md) | UI components & design system |

---

## 🎨 Design Philosophy

TripNode uses an **Eco-Tech Light Mode** design:
- **Base:** Off-white (`#f8fafc`) — reduces cognitive load during complex planning
- **Primary:** Teal / Emerald — fresh, calm, efficient
- **Locked items:** Amber — distinct "don't touch" visual language
- **AI items:** Teal — AI suggestions feel natural, not intrusive
- **Interactions:** Micro-animations (hover lifts, slide-ins, drag rotation) for a playful, tactile feel

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
