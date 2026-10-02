# TripNode — Preparation Guide

> How to obtain all API keys, credentials, and service accounts needed for TripNode.

---

## 1. Google AI Studio — Gemini API Key

Used for: AI-powered itinerary gap-filling (Contextual Fill-the-Blank).

**Steps:**
1. Go to https://aistudio.google.com
2. Sign in with your Google account
3. Click **Get API Key** in the left sidebar
4. Click **Create API Key** → Select your Google Cloud project (or create a new one)
5. Copy the generated key

**Where to paste:**
```
backend/.env → GEMINI_API_KEY=your_key_here
```

**Free Tier:**
- Gemini 1.5 Flash: 15 RPM, 1 million TPM, 1,500 RPD (free)
- Gemini 1.5 Pro: 2 RPM, 32,000 TPM, 50 RPD (free)

---

## 2. Google Cloud Console — Places API Key

Used for: Place search, coordinates, operating hours, and photos.

**Steps:**
1. Go to https://console.cloud.google.com
2. Create a new project (or use the same one from AI Studio)
3. In the top search bar, type **"Places API"** → Click **Enable**
4. Also enable **"Maps JavaScript API"** for the frontend map
5. Go to **Credentials** → **Create Credentials** → **API Key**
6. Click **Restrict Key**:
   - Under **API restrictions**, select: Places API, Maps JavaScript API
   - Under **Application restrictions**, add your domain (for production) or leave unrestricted for dev
7. Copy the key

**Where to paste:**
```
backend/.env  → GOOGLE_PLACES_API_KEY=your_key_here
frontend/.env → VITE_GOOGLE_MAPS_KEY=your_key_here
```

**Important:** Set up Billing on your Google Cloud project. New accounts get a $300 free credit. Places API has a free tier of $200/month.

---

## 3. Supabase — Database & Auth

Used for: PostgreSQL database, user authentication, real-time subscriptions, and file storage.

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

---

## 4. OSRM — Open Source Routing Machine

Used for: Free route distance matrix and route optimization (no API key needed!).

TripNode uses the public OSRM demo server:
```
http://router.project-osrm.org
```

**No setup needed.** This is already pre-configured in the backend.

> ⚠️ **Production Note:** For production, self-host OSRM or switch to Mapbox Directions API for rate-limit reliability. The public demo server should only be used for development.

**Self-hosting OSRM (optional):**
```bash
docker pull osrm/osrm-backend
# Download OSM data for your region from https://download.geofabrik.de/
```

---

## 5. GitHub Repository Setup

**Steps:**
1. Go to https://github.com and log in
2. Click **+** → **New repository**
3. Fill in:
   - **Repository name**: `tripnode`
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

# Google APIs
GOOGLE_PLACES_API_KEY=your_google_places_key_here

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

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

# Google Maps (public)
VITE_GOOGLE_MAPS_KEY=your_google_maps_key_here
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
