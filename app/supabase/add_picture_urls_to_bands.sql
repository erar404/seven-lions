-- Add picture_urls column to existing bands table
-- Run this if you already applied migrate_to_seven_lions_schema.sql or add_bands_table.sql

ALTER TABLE "seven-lions-db".bands
  ADD COLUMN IF NOT EXISTS picture_urls TEXT[] NOT NULL DEFAULT '{}';
