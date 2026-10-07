-- ============================================================
-- TripNode — Supabase PostgreSQL Schema
-- Run this entire script in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── Enable UUID extension ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. USERS ─────────────────────────────────────────────────────────────────
-- Mirror of Supabase auth.users, used for profile data
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. TRIPS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trips (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title                TEXT        NOT NULL,
  destination_city     TEXT        NOT NULL,
  destination_country  TEXT        NOT NULL DEFAULT '',
  start_date           DATE        NOT NULL,
  end_date             DATE        NOT NULL,
  traveler_count       INT         NOT NULL DEFAULT 1 CHECK (traveler_count >= 1),
  travel_style         TEXT        NOT NULL DEFAULT 'leisure'
                         CHECK (travel_style IN ('backpacker','leisure','luxury','family-friendly','adventure','cultural')),
  hotel_name           TEXT        NOT NULL,
  hotel_address        TEXT,
  hotel_lat            DOUBLE PRECISION,
  hotel_lng            DOUBLE PRECISION,
  status               TEXT        NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','generating','ready','finalized')),
  share_token          TEXT        UNIQUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. TRIP_DAYS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_days (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id     UUID        NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number  INT         NOT NULL CHECK (day_number >= 1),
  date        DATE        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, day_number)
);

-- ─── 4. ITINERARY_ITEMS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_day_id           UUID        NOT NULL REFERENCES public.trip_days(id) ON DELETE CASCADE,
  trip_id               UUID        NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id              TEXT,                   -- Google Places ID (for caching)
  name                  TEXT        NOT NULL,
  type                  TEXT        NOT NULL DEFAULT 'suggested'
                          CHECK (type IN ('hotel','anchor','suggested')),
  status                TEXT        NOT NULL DEFAULT 'suggested'
                          CHECK (status IN ('locked','suggested')),
  category              TEXT,                   -- e.g. 'restaurant','attraction','cafe'
  lat                   DOUBLE PRECISION,
  lng                   DOUBLE PRECISION,
  address               TEXT,
  photo_url             TEXT,
  start_time            TIME,                   -- e.g. '09:00'
  end_time              TIME,                   -- e.g. '11:00'
  duration_minutes      INT,
  distance_from_prev_km DOUBLE PRECISION,       -- filled after OSRM calculation
  notes                 TEXT,
  sort_order            INT         NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. PLACES_CACHE ──────────────────────────────────────────────────────────
-- Cache Google Places API responses to avoid redundant calls
CREATE TABLE IF NOT EXISTS public.places_cache (
  place_id    TEXT        PRIMARY KEY,          -- Google Place ID
  name        TEXT        NOT NULL,
  address     TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  photo_url   TEXT,
  opening_hours JSONB,
  types       TEXT[],                           -- Google Place types array
  rating      NUMERIC(2,1),
  raw_data    JSONB,                            -- full Google response
  cached_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trips_user_id        ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_share_token    ON public.trips(share_token);
CREATE INDEX IF NOT EXISTS idx_trip_days_trip_id    ON public.trip_days(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_trip_id    ON public.itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_day_id     ON public.itinerary_items(trip_day_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_sort       ON public.itinerary_items(trip_day_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON public.places_cache(expires_at);

-- ─── TRIGGERS — auto-update updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER itinerary_items_updated_at
  BEFORE UPDATE ON public.itinerary_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY (RLS) ─────────────────────────────────────────────────
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_days       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places_cache    ENABLE ROW LEVEL SECURITY;

-- Users: can only see/edit own profile
CREATE POLICY "users_own" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Trips: owner full access; share_token allows public read
CREATE POLICY "trips_owner_all" ON public.trips
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "trips_public_read" ON public.trips
  FOR SELECT USING (share_token IS NOT NULL);

-- Trip days: accessible if user owns the parent trip
CREATE POLICY "trip_days_owner" ON public.trip_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_days.trip_id
        AND trips.user_id = auth.uid()
    )
  );

-- Itinerary items: accessible if user owns the parent trip
CREATE POLICY "itinerary_items_owner" ON public.itinerary_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = itinerary_items.trip_id
        AND trips.user_id = auth.uid()
    )
  );

-- Places cache: service role manages it, authenticated users can read
CREATE POLICY "places_cache_read" ON public.places_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── SERVICE ROLE BYPASS (for backend with service_role key) ──────────────────
-- The backend uses service_role key which bypasses RLS automatically.
-- No additional policies needed for service_role.

-- ─── DONE ─────────────────────────────────────────────────────────────────────
-- Verify with:
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
