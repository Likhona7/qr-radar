-- QR Radar source discovery proof tables
-- Run this in Supabase SQL Editor. It is safe to run more than once.

CREATE TABLE IF NOT EXISTS public.source_ingestion_runs (
  id BIGSERIAL PRIMARY KEY,
  view_mode TEXT DEFAULT 'b2c',
  source_type TEXT,
  source_name TEXT,
  items_seen INTEGER DEFAULT 0,
  items_saved INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  run_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.source_ingestion_runs
  ADD COLUMN IF NOT EXISTS view_mode TEXT DEFAULT 'b2c',
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS items_seen INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_saved INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS run_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_source_ingestion_runs_view_mode_run_at
  ON public.source_ingestion_runs (view_mode, run_at DESC);

CREATE TABLE IF NOT EXISTS public.source_freshness_ledger (
  id BIGSERIAL PRIMARY KEY,
  view_mode TEXT DEFAULT 'b2c',
  source_type TEXT,
  source_name TEXT,
  status TEXT DEFAULT 'fresh',
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_item_at TIMESTAMPTZ DEFAULT NOW(),
  items_seen INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.source_freshness_ledger
  ADD COLUMN IF NOT EXISTS view_mode TEXT DEFAULT 'b2c',
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'fresh',
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_item_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS items_seen INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_freshness_ledger_unique_source
  ON public.source_freshness_ledger (view_mode, source_type, source_name);

CREATE INDEX IF NOT EXISTS idx_source_freshness_ledger_view_mode_updated_at
  ON public.source_freshness_ledger (view_mode, updated_at DESC);

-- Keep Data API reads available for the service/backend client.
GRANT SELECT, INSERT, UPDATE ON public.source_ingestion_runs TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.source_freshness_ledger TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

SELECT
  'source discovery ledger schema ready' AS status,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'source_freshness_ledger'
      AND column_name = 'view_mode'
  ) AS has_view_mode,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_source_freshness_ledger_unique_source'
  ) AS has_unique_source_index;
