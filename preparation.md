# TripNode — Preparation Guide

> How to obtain all API keys, credentials, and service accounts needed for TripNode.
> **No credit card required for any service listed here.**

---

## 1. Google AI Studio — Gemini API Key

Used for: AI-powered itinerary gap-filling (Contextual Fill-the-Blank) and approximate coordinate fallback.

**Steps:**
1. Go to https://aistudio.google.com
2. Sign in with your Google account
3. Click **Get API Key** in the left sidebar
4. Click **Create API Key** → Select your Google Cloud project (or create a new one)
5. Copy the generated key

**Where to paste:**
```
backend/.env → GOOGLE_GEMINI_API_KEY=your_key_here
```

**Free Tier (no credit card):**
- gemini-3.5-flash-lite: 1,500 requests/day
- gemini-1.5-flash: 1,500 requests/day

---

## 2. Geoapify — Geocoding & Autocomplete API Key

Used for: Converting place names to real GPS coordinates (lat/lng), powering route distance calculations.

> ✅ **100% Free, No Credit Card, No Billing Required.**
> Just sign up with Google/GitHub and copy your key.

**Steps:**
1. Go to https://myprojects.geoapify.com
2. Click **Sign Up** → use **Continue with Google** or **Continue with GitHub**
3. After login, you'll see your default project (**"My First Project"**)
4. Click the project → go to **API Keys** tab
5. Copy the API Key shown

**Where to paste:**
```
backend/.env → GEOAPIFY_API_KEY=your_key_here
```

**Free Tier:**
- 3,000 requests/day (more than enough for a travel planner)
- Includes: Geocoding, Autocomplete, Place Search

---

## 3. Supabase — Database & Auth

Used for: PostgreSQL database, user authentication, and places cache storage.

**Steps:**
1. Go to https://supabase.com and sign up / log in
2. Click **New Project**
3. Fill in:
   - **Organization**: (create one or select existing)
   - **Project Name**: `tripnode`
   - **Database Password**: Use a strong password and **save it somewhere safe**
   - **Region**: Choose nearest (e.g., Southeast Asia → Singapore)
4. Wait ~2 minutes for the project to initialize
5. Go to **Project Settings** → **API**
6. Copy the following values:
   - **Project URL** (e.g., `https://xxxx.supabase.co`)
   - **anon / public** key (safe to use in frontend)
   - **service_role** key (secret! backend only, never expose to frontend)

**Where to paste:**
```
backend/.env  → SUPABASE_URL=https://xxxx.supabase.co
backend/.env  → SUPABASE_SERVICE_KEY=your_service_role_key
frontend/.env → VITE_SUPABASE_URL=https://xxxx.supabase.co
frontend/.env → VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Free Tier:** 500 MB database, 1 GB file storage, 50,000 monthly active users — more than enough for MVP.

### Database Setup

After creating your Supabase project, run the migration script in the Supabase **SQL Editor**:

```
backend/db/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, indexes, and triggers in one shot.

---

## 4. OSRM — Open Source Routing Machine

Used for: Free route distance calculations between itinerary stops (no API key needed!).

TripNode uses the public OSRM demo server:
```
http://router.project-osrm.org
```

**No setup needed.** This is already pre-configured in the backend.

> ⚠️ **Production Note:** For production, self-host OSRM or switch to Mapbox Directions API for rate-limit reliability. The public demo server should only be used for development.

---

## 5. GitHub Repository Setup

**Steps:**
1. Go to https://github.com and log in
2. Click **+** → **New repository**
3. Fill in:
   - **Repository name**: `tripnode` (or `TripNode-Travel-Planner`)
   - **Description**: `Hybrid AI Travel Planner Web App`
   - **Visibility**: Public or Private (your choice)
   - **Do NOT** initialize with README (you already have one)
4. Click **Create repository**
5. Follow GitHub's instructions to push your existing local repo:

```bash
git remote add origin https://github.com/YOUR_USERNAME/tripnode.git
git branch -M main
git push -u origin main
```

---

## 6. Environment Variables Summary

### `backend/.env`
```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Places & Geocoding (no credit card needed — use Geoapify)
GEOAPIFY_API_KEY=your_geoapify_api_key_here
# Optional: Google Places (requires billing enabled on Google Cloud)
# GOOGLE_PLACES_API_KEY=your_google_places_key_here

# Gemini AI
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODELS=

# OSRM (no key needed, using public demo server)
OSRM_BASE_URL=http://router.project-osrm.org

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_string_here
```

### `frontend/.env`
```env
# Backend API
VITE_API_BASE_URL=http://localhost:5000/api

# Supabase (public keys only)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 7. Generating a Secure JWT Secret

Run this in your terminal to generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as `JWT_SECRET` in your `backend/.env`.

---

## 8. Security Best Practices

- **Never commit `.env` files** — they are listed in `.gitignore`
- **Never expose** the Supabase `service_role` key in frontend code
- **Rotate API keys** if you accidentally push them to a public repo
- Use **GitHub Secrets** for CI/CD pipelines (not hardcoded values)
- Enable **Supabase Row Level Security (RLS)** before going to production
