-- QR Radar source discovery ledger proof polish
-- Run this only if the backend patch reports missing source ledger columns.
-- Safe to run more than once.

ALTER TABLE public.source_ingestion_runs
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duplicates_skipped INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claude_calls INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS web_search_used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS error TEXT;

ALTER TABLE public.source_freshness_ledger
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS items_saved INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freshness_state TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS error TEXT;

CREATE INDEX IF NOT EXISTS idx_source_ingestion_runs_view_mode_completed_at
  ON public.source_ingestion_runs (view_mode, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_freshness_ledger_view_mode_checked_at
  ON public.source_freshness_ledger (view_mode, last_checked_at DESC);

SELECT
  'source ledger proof polish fields ready' AS status,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'source_freshness_ledger'
      AND column_name = 'items_saved'
  ) AS has_items_saved,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'source_freshness_ledger'
      AND column_name = 'confidence_score'
  ) AS has_confidence_score;
