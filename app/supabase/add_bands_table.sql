-- Add bands table to seven-lions-db schema
-- Run this if you already applied migrate_to_seven_lions_schema.sql

CREATE TABLE IF NOT EXISTS "seven-lions-db".bands (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID,
  band_name          TEXT NOT NULL,
  band_description   TEXT,
  loyalty_card_count INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON "seven-lions-db".bands
  TO anon, authenticated;

GRANT ALL
  ON "seven-lions-db".bands
  TO postgres, service_role;
