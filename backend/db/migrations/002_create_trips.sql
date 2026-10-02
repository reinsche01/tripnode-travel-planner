-- Migration 002: Create trips table

CREATE TYPE travel_style AS ENUM ('backpacker', 'leisure', 'luxury', 'family');
CREATE TYPE trip_status AS ENUM ('draft', 'finalized');

CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  traveler_count INT NOT NULL DEFAULT 1,
  travel_style travel_style NOT NULL DEFAULT 'leisure',
  hotel_name TEXT NOT NULL,
  hotel_lat FLOAT8,
  hotel_lng FLOAT8,
  hotel_address TEXT,
  share_token TEXT UNIQUE,
  status trip_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_share_token ON public.trips(share_token);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own trips; public can read via share_token
CREATE POLICY "Users can manage own trips"
  ON public.trips FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read shared trips"
  ON public.trips FOR SELECT
  USING (share_token IS NOT NULL);

-- Auto-update updated_at
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
