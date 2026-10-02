-- Migration 005: Create places_cache table
-- Caches Google Places data to reduce API costs (30-day TTL)

CREATE TABLE IF NOT EXISTS public.places_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  lat FLOAT8 NOT NULL,
  lng FLOAT8 NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  rating FLOAT4,
  photo_url TEXT,
  opening_hours JSONB,
  types TEXT[],
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_places_cache_place_id ON public.places_cache(google_place_id);
CREATE INDEX idx_places_cache_name ON public.places_cache USING GIN (to_tsvector('english', name));
CREATE INDEX idx_places_cache_expires_at ON public.places_cache(expires_at);

-- No RLS needed — this is a server-managed cache table accessed via service_role key
-- Public reads are safe (just place info), writes restricted to backend

ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role (backend) full access
CREATE POLICY "Service role has full access to places cache"
  ON public.places_cache FOR ALL
  USING (true);

-- Auto-delete expired cache entries (runs via pg_cron if enabled, or manually)
-- To enable pg_cron in Supabase: Extensions > pg_cron > Enable
-- SELECT cron.schedule('0 0 * * *', $$DELETE FROM places_cache WHERE expires_at < NOW()$$);
