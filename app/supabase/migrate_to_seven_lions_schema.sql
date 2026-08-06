-- ============================================================
-- Seven Lions Studio — Schema Setup
-- Creates all app tables directly in `seven-lions-db`
--
-- Run this in: Supabase Dashboard → SQL Editor
-- After running, go to: Settings → API → Exposed schemas
--   and add  seven-lions-db  to the list, then save.
-- ============================================================

-- 1. Create the schema
CREATE SCHEMA IF NOT EXISTS "seven-lions-db";

-- 2. Grant access to Supabase roles
GRANT USAGE ON SCHEMA "seven-lions-db"
  TO postgres, anon, authenticated, service_role;

-- 3. Create enum types
CREATE TYPE "seven-lions-db".booking_status AS ENUM (
  'pending', 'approved', 'rejected', 'cancelled'
);

CREATE TYPE "seven-lions-db".service_type AS ENUM (
  'recording', 'jingle', 'guitar_lesson', 'drum_lesson',
  'guitar_repair', 'bass_repair', 'video_shoot'
);

CREATE TYPE "seven-lions-db".gallery_category AS ENUM (
  'studio', 'gear', 'lessons', 'parking', 'general'
);

-- 4. Create tables

CREATE TABLE "seven-lions-db".users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id      UUID,
  email        TEXT,
  name         TEXT,
  middle_initial TEXT,
  username     TEXT,
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'user',
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "seven-lions-db".seven_lions_service_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID,
  service_type   "seven-lions-db".service_type NOT NULL,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT NOT NULL,
  message        TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  status         "seven-lions-db".booking_status NOT NULL DEFAULT 'pending',
  admin_notes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "seven-lions-db".seven_lions_rehearsal_bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID,
  band_name     TEXT NOT NULL,
  contact_name  TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  booking_date  DATE NOT NULL,
  start_time    TEXT NOT NULL,
  end_time      TEXT NOT NULL,
  num_members   INT NOT NULL DEFAULT 1,
  notes         TEXT,
  status        "seven-lions-db".booking_status NOT NULL DEFAULT 'pending',
  admin_notes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "seven-lions-db".seven_lions_gallery (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url        TEXT NOT NULL,
  alt        TEXT,
  caption    TEXT,
  category   "seven-lions-db".gallery_category NOT NULL DEFAULT 'general',
  sort_order INT NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "seven-lions-db".seven_lions_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "seven-lions-db".bands (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID,
  band_name          TEXT NOT NULL,
  band_description   TEXT,
  loyalty_card_count INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA "seven-lions-db"
  TO anon, authenticated;

GRANT ALL
  ON ALL TABLES IN SCHEMA "seven-lions-db"
  TO postgres, service_role;

-- 6. Grant sequence permissions
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA "seven-lions-db"
  TO anon, authenticated;

GRANT ALL
  ON ALL SEQUENCES IN SCHEMA "seven-lions-db"
  TO postgres, service_role;

-- 7. Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA "seven-lions-db"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA "seven-lions-db"
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
