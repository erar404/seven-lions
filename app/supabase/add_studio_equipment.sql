-- Studio Equipment Rentals table
CREATE TABLE IF NOT EXISTS studio_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_name TEXT NOT NULL,
  equipment_desc TEXT,
  equipment_price_hr NUMERIC(10, 2),
  equipment_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
