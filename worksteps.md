# TripNode — Work Steps Guide

> Step-by-step guide to set up, develop, and deploy the TripNode Hybrid AI Travel Planner.

---

## Phase 0 — Prerequisites & Preparation

Before anything, make sure you have:

- [ ] **Node.js** v20+ installed → https://nodejs.org
- [ ] **Git** installed → https://git-scm.com
- [ ] **VS Code** (recommended) or any code editor
- [ ] A **Google Account** (for Google Cloud Console)
- [ ] A **Supabase Account** → https://supabase.com
- [ ] A **Google AI Studio Account** → https://aistudio.google.com

See `preparation.md` for detailed API key acquisition steps.

---

## Phase 1 — Repository & Project Initialization

### 1.1 Clone / Initialize Repository
```bash
# If starting fresh
git init
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tripnode.git

# OR clone if repo already exists
git clone https://github.com/YOUR_USERNAME/tripnode.git
cd tripnode
```

### 1.2 Install Backend Dependencies
```bash
cd backend
npm install
```

### 1.3 Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

## Phase 2 — Environment Configuration

### 2.1 Backend `.env`
```bash
cd backend
cp .env.example .env
# Fill in all values (see preparation.md for where to get each key)
```

### 2.2 Frontend `.env`
```bash
cd frontend
cp .env.example .env
# Fill in the public-safe values
```

---

## Phase 3 — Supabase Database Setup

### 3.1 Create Supabase Project
1. Go to https://app.supabase.com
2. Click **New Project** → fill in name `tripnode`, set a strong DB password
3. Choose a region close to your target users (e.g., Southeast Asia)
4. Wait for the project to spin up (~2 minutes)

### 3.2 Run Database Migrations
In the Supabase Dashboard → **SQL Editor**, open and run each file in order from `backend/db/migrations/`:
- `001_create_users.sql`
- `002_create_trips.sql`
- `003_create_trip_days.sql`
- `004_create_itinerary_items.sql`
- `005_create_places_cache.sql`

Or run via CLI if you have Supabase CLI installed:
```bash
supabase db push
```

### 3.3 Verify Tables
In the Supabase dashboard → **Table Editor**, you should see:
- `users`
- `trips`
- `trip_days`
- `itinerary_items`
- `places_cache`

---

## Phase 4 — Running Locally

### 4.1 Start Backend (Terminal 1)
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

### 4.2 Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
# Vite dev server starts at http://localhost:5173
```

### 4.3 Verify
- Open http://localhost:5173 in your browser
- The frontend should communicate with the backend at port 5000

---

## Phase 5 — Feature Development Order

Follow this order to build features incrementally:

1. **User Authentication** (Supabase Auth)
2. **Trip Creation Form** (city, dates, travelers, style)
3. **Anchor Input** (hotel + must-visit places)
4. **Gemini AI Gap-Fill** (LOCKED vs SUGGESTED slots)
5. **Geoapify Integration** (geocoding + coordinates validation)
6. **OSRM Route Optimization** (distance matrix)
7. **Interactive Timeline** (drag-and-drop)
8. **PDF Export**
9. **Collaboration Link Sharing**

---

## Phase 6 — Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

---

## Phase 7 — GitHub Push (First Time)

```bash
# From project root
git add .
git commit -m "feat: initial TripNode project structure"
git push -u origin main
```

---

## Phase 8 — Deployment

### 8.1 Backend (Railway / Render)
1. Go to https://railway.app or https://render.com
2. Click **New Project** → **Deploy from GitHub Repo**
3. Select your `tripnode` repository → set root to `/backend`
4. Add all environment variables from `.env` in the platform dashboard
5. Deploy

### 8.2 Frontend (Vercel / Netlify)
1. Go to https://vercel.com
2. Click **Add New Project** → Import from GitHub
3. Set root directory to `/frontend`
4. Add `VITE_API_BASE_URL` = your deployed backend URL
5. Deploy

---

## Phase 9 — Post-Deployment Checklist

- [ ] CORS configured to allow the frontend domain
- [ ] All API keys rotated to production keys
- [ ] Supabase Row Level Security (RLS) enabled on all tables
- [ ] Rate limiting active on backend routes
- [ ] Error monitoring configured (e.g., Sentry)
- [ ] `README.md` updated with live demo URL

---

## Git Workflow

```bash
# Feature branch workflow
git checkout -b feat/your-feature-name
# ... make changes ...
git add .
git commit -m "feat: describe what you did"
git push origin feat/your-feature-name
# Open Pull Request on GitHub → merge to main
```

### Commit Message Convention
| Prefix      | Use for                      |
|-------------|------------------------------|
| `feat:`     | New features                 |
| `fix:`      | Bug fixes                    |
| `docs:`     | Documentation only           |
| `style:`    | UI/CSS changes               |
| `refactor:` | Code restructuring           |
| `test:`     | Adding/fixing tests          |
| `chore:`    | Build/config/tooling changes |
