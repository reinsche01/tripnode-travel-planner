-- Migration 004: Create itinerary_items table

CREATE TYPE item_type AS ENUM ('hotel', 'anchor', 'suggested');
CREATE TYPE item_status AS ENUM ('locked', 'suggested');
CREATE TYPE item_category AS ENUM ('food', 'culture', 'nature', 'shopping', 'entertainment', 'wellness', 'other');

CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id UUID NOT NULL REFERENCES public.trip_days(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id TEXT,                         -- Google Places place_id
  name TEXT NOT NULL,
  type item_type NOT NULL DEFAULT 'suggested',
  status item_status NOT NULL DEFAULT 'suggested',
  category item_category,
  lat FLOAT8,
  lng FLOAT8,
  address TEXT,
  photo_url TEXT,
  start_time TIME,
  end_time TIME,
  duration_minutes INT,
  distance_from_prev_km FLOAT8,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_itinerary_items_trip_id ON public.itinerary_items(trip_id);
CREATE INDEX idx_itinerary_items_trip_day_id ON public.itinerary_items(trip_day_id);
CREATE INDEX idx_itinerary_items_status ON public.itinerary_items(status);

ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage items via trip ownership"
  ON public.itinerary_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = itinerary_items.trip_id AND trips.user_id = auth.uid()
    )
  );

-- Allow public read for shared trips
CREATE POLICY "Public can read items of shared trips"
  ON public.itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = itinerary_items.trip_id AND trips.share_token IS NOT NULL
    )
  );
