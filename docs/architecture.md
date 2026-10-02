# TripNode — Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│                    React + Vite + Tailwind CSS                  │
│                    (http://localhost:5173)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API (JSON)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NODE.JS BACKEND                            │
│                  Express.js (port 5000)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Auth Router │  │  Trip Router │  │   AI Router          │  │
│  │  /api/auth   │  │  /api/trips  │  │   /api/ai            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Service Layer                          │  │
│  │  geminiService | placesService | osrmService | authSvc   │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────┬───────────────────┬──────────────────┬───────────────────┘
       │                   │                  │
       ▼                   ▼                  ▼
┌─────────────┐  ┌──────────────────┐  ┌───────────────┐
│  Supabase   │  │  Google Places   │  │  OSRM Server  │
│ (PostgreSQL)│  │  API             │  │  (Free Routing│
│  + Auth     │  │  (Cached in DB)  │  │   Engine)     │
└─────────────┘  └──────────────────┘  └───────────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │   Gemini API     │
                 │  (Structured     │
                 │   JSON Output)   │
                 └──────────────────┘
```

---

## Data Flow: AI Itinerary Generation

```
User Input (city, dates, hotel, anchors)
         │
         ▼
  Backend validates input
         │
         ▼
  Google Places API → resolve coordinates + hours → Cache in Supabase
         │
         ▼
  Build Gemini prompt with:
  - Hotel as gravity center
  - LOCKED slots (user anchors)
  - Empty time slots to fill
         │
         ▼
  Gemini API returns structured JSON itinerary
         │
         ▼
  OSRM calculates route distances between all items
         │
         ▼
  Final itinerary JSON saved to Supabase
         │
         ▼
  Frontend renders interactive timeline
```

---

## Database Schema (ERD Summary)

```
users
  id (uuid, PK)
  email (text, unique)
  name (text)
  avatar_url (text)
  created_at (timestamptz)

trips
  id (uuid, PK)
  user_id (uuid, FK → users.id)
  title (text)
  destination_city (text)
  destination_country (text)
  start_date (date)
  end_date (date)
  traveler_count (int)
  travel_style (enum: backpacker|leisure|luxury|family)
  hotel_name (text)
  hotel_lat (float8)
  hotel_lng (float8)
  hotel_address (text)
  share_token (text, unique)
  status (enum: draft|finalized)
  created_at (timestamptz)
  updated_at (timestamptz)

trip_days
  id (uuid, PK)
  trip_id (uuid, FK → trips.id)
  day_number (int)
  date (date)
  created_at (timestamptz)

itinerary_items
  id (uuid, PK)
  trip_day_id (uuid, FK → trip_days.id)
  trip_id (uuid, FK → trips.id)
  place_id (text)              -- Google Places ID
  name (text)
  type (enum: hotel|anchor|suggested)
  status (enum: locked|suggested)
  category (text)              -- e.g., food, culture, nature
  lat (float8)
  lng (float8)
  address (text)
  photo_url (text)
  start_time (time)
  end_time (time)
  duration_minutes (int)
  distance_from_prev_km (float8)
  notes (text)
  sort_order (int)
  created_at (timestamptz)

places_cache
  id (uuid, PK)
  google_place_id (text, unique)
  name (text)
  lat (float8)
  lng (float8)
  address (text)
  phone (text)
  website (text)
  rating (float4)
  photo_url (text)
  opening_hours (jsonb)
  types (text[])
  cached_at (timestamptz)
  expires_at (timestamptz)
```

---

## API Design

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected routes require:
```
Authorization: Bearer <supabase_jwt_token>
```

### Key Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login user |
| GET | `/trips` | List user's trips |
| POST | `/trips` | Create new trip |
| GET | `/trips/:id` | Get trip details |
| PUT | `/trips/:id` | Update trip |
| DELETE | `/trips/:id` | Delete trip |
| POST | `/trips/:id/generate` | Trigger AI generation |
| PUT | `/trips/:id/items/:itemId` | Update itinerary item |
| DELETE | `/trips/:id/items/:itemId` | Remove item |
| POST | `/trips/:id/reorder` | Reorder items after drag |
| GET | `/trips/:id/export/pdf` | Download PDF |
| GET | `/trips/share/:token` | Get shared trip (public) |
| GET | `/places/search` | Search places (cached) |

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | SPA framework |
| Styling | Tailwind CSS v3 | Utility-first CSS |
| State | Zustand | Lightweight global state |
| Frontend HTTP | Axios | API calls |
| Drag & Drop | @dnd-kit/core | Timeline drag-and-drop |
| PDF | jsPDF + html2canvas | Client-side PDF export |
| Backend | Node.js + Express.js | REST API server |
| ORM/DB Client | @supabase/supabase-js | Database access |
| Auth | Supabase Auth | JWT-based auth |
| AI | Google Gemini 1.5 Flash | Structured itinerary generation |
| Places | Google Places API | Place data + geocoding |
| Routing | OSRM (public) | Free distance matrix |
| Database | Supabase (PostgreSQL) | Data persistence + caching |

---

## Caching Strategy

```
Request for place data
         │
         ▼
  Check places_cache in Supabase
  (where google_place_id = ? AND expires_at > NOW())
         │
    ┌────┴────┐
   HIT       MISS
    │         │
    ▼         ▼
  Return   Call Google Places API
  cached     │
  data       ▼
           Store result in places_cache
           (TTL: 30 days)
             │
             ▼
           Return fresh data
```

Cache TTL: **30 days** for static place data (name, coords, hours rarely change)
