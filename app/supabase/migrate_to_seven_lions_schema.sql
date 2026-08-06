-- ============================================================
-- Seven Lions Studio — Schema Migration
-- Moves all app tables from `public` to `seven-lions-db`
--
-- Run this in: Supabase Dashboard → SQL Editor
-- After running, go to: Settings → API → Exposed schemas
--   and add  seven-lions-db  to the list, then save.
-- ============================================================

-- 1. Create the new schema
CREATE SCHEMA IF NOT EXISTS "seven-lions-db";

-- 2. Grant access to Supabase roles
GRANT USAGE ON SCHEMA "seven-lions-db"
  TO postgres, anon, authenticated, service_role;

-- 3. Move tables from public → seven-lions-db
ALTER TABLE public.users
  SET SCHEMA "seven-lions-db";

ALTER TABLE public.seven_lions_service_requests
  SET SCHEMA "seven-lions-db";

ALTER TABLE public.seven_lions_rehearsal_bookings
  SET SCHEMA "seven-lions-db";

ALTER TABLE public.seven_lions_gallery
  SET SCHEMA "seven-lions-db";

ALTER TABLE public.seven_lions_settings
  SET SCHEMA "seven-lions-db";

-- 4. Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA "seven-lions-db"
  TO anon, authenticated;

GRANT ALL
  ON ALL TABLES IN SCHEMA "seven-lions-db"
  TO postgres, service_role;

-- 5. Grant sequence permissions (needed for INSERT with auto-increment)
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA "seven-lions-db"
  TO anon, authenticated;

GRANT ALL
  ON ALL SEQUENCES IN SCHEMA "seven-lions-db"
  TO postgres, service_role;

-- 6. Set default privileges so future tables also get these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA "seven-lions-db"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA "seven-lions-db"
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
