-- Seven Lions Studio tables
-- Run this migration on the shared Supabase project (nhxozevkhypnfueybufj)
-- The 'users' table already exists from the Spoiled Brats HQ project

-- Service requests (recording, lessons, repair, video shoots)
CREATE TABLE IF NOT EXISTS seven_lions_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  service_type text NOT NULL CHECK (service_type IN (
    'recording', 'jingle', 'guitar_lesson', 'drum_lesson',
    'guitar_repair', 'bass_repair', 'video_shoot'
  )),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  message text,
  preferred_date date,
  preferred_time text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Band rehearsal bookings
CREATE TABLE IF NOT EXISTS seven_lions_rehearsal_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  band_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  num_members int DEFAULT 1,
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Gallery photos
CREATE TABLE IF NOT EXISTS seven_lions_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  alt text,
  caption text,
  category text DEFAULT 'general' CHECK (category IN ('studio', 'gear', 'lessons', 'parking', 'general')),
  sort_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Page settings / content management
CREATE TABLE IF NOT EXISTS seven_lions_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE seven_lions_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE seven_lions_rehearsal_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seven_lions_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE seven_lions_settings ENABLE ROW LEVEL SECURITY;

-- Helper function (reuse from spoiled brats if exists, otherwise create)
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
$$;

-- Service requests policies
CREATE POLICY "Anyone can submit a service request"
  ON seven_lions_service_requests FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view their own requests"
  ON seven_lions_service_requests FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Admins can view all requests"
  ON seven_lions_service_requests FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can update requests"
  ON seven_lions_service_requests FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

-- Rehearsal bookings policies
CREATE POLICY "Authenticated users can book rehearsal"
  ON seven_lions_rehearsal_bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own bookings"
  ON seven_lions_rehearsal_bookings FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Admins can view all bookings"
  ON seven_lions_rehearsal_bookings FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admins can update bookings"
  ON seven_lions_rehearsal_bookings FOR UPDATE
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Public can view approved bookings for calendar"
  ON seven_lions_rehearsal_bookings FOR SELECT
  TO public
  USING (status = 'approved');

-- Gallery policies
CREATE POLICY "Anyone can view active gallery"
  ON seven_lions_gallery FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins can manage gallery"
  ON seven_lions_gallery FOR ALL
  TO authenticated
  USING (is_current_user_admin());

-- Settings policies
CREATE POLICY "Anyone can view settings"
  ON seven_lions_settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can update settings"
  ON seven_lions_settings FOR ALL
  TO authenticated
  USING (is_current_user_admin());

-- Storage bucket for Seven Lions (run in dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('seven-lions-photos', 'seven-lions-photos', true)
-- ON CONFLICT DO NOTHING;

-- Seed default settings
INSERT INTO seven_lions_settings (key, value) VALUES
  ('hero_title', 'WHERE MUSIC COMES TO LIFE'),
  ('hero_subtitle', 'Professional recording studio, rehearsal space, and music education in Quezon City'),
  ('hero_image', 'https://sevenlions-studio.carrd.co/assets/images/gallery01/b00e64fc.jpg'),
  ('address', 'Jorjo Bldg, Tandang Sora, Quezon City'),
  ('phone', '09397321218'),
  ('facebook', 'sevenlions.studio'),
  ('instagram', 'sevenlions.studio'),
  ('tiktok', '@sevenlions.studio'),
  ('maps_url', 'https://maps.app.goo.gl/RDfGcAFp3UFiVFM86')
ON CONFLICT (key) DO NOTHING;

-- Seed default gallery images from carrd
INSERT INTO seven_lions_gallery (url, alt, category, sort_order) VALUES
  ('https://sevenlions-studio.carrd.co/assets/images/gallery01/b00e64fc.jpg', 'Seven Lions Studio space', 'studio', 1),
  ('https://sevenlions-studio.carrd.co/assets/images/gallery01/b6bbffd3.jpg', 'Studio rehearsal space', 'studio', 2),
  ('https://sevenlions-studio.carrd.co/assets/images/gallery01/2b1b1c2f.jpg', 'Studio equipment', 'studio', 3),
  ('https://sevenlions-studio.carrd.co/assets/images/gallery01/446dddbf.jpg', 'Studio space view', 'studio', 4),
  ('https://sevenlions-studio.carrd.co/assets/images/gallery01/12e19021.jpg', 'Studio interior', 'studio', 5),
  ('https://sevenlions-studio.carrd.co/assets/images/gallery01/77eac1ff.jpg', 'Studio setup', 'studio', 6),
  ('https://sevenlions-studio.carrd.co/assets/images/gallery02/1bd3d74c.jpg', 'Backline gear', 'gear', 7),
  ('https://sevenlions-studio.carrd.co/assets/images/gallery02/53a0c917.jpg', 'Studio gear', 'gear', 8),
  ('https://sevenlions-studio.carrd.co/assets/images/gallery02/e4e1129c.jpg', 'Equipment', 'gear', 9),
  ('https://sevenlions-studio.carrd.co/assets/images/gallery02/c3629f44.jpg', 'Backline setup', 'gear', 10),
  ('https://sevenlions-studio.carrd.co/assets/images/gallery04/94604cee_original.jpg', 'Lesson packages', 'lessons', 11),
  ('https://sevenlions-studio.carrd.co/assets/images/gallery04/9f02aaef_original.jpg', 'Music lessons', 'lessons', 12)
ON CONFLICT DO NOTHING;
