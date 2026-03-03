-- ChurchesNearMe Database Schema

-- Churches table
CREATE TABLE churches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  denomination TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  service_times JSONB, -- { "sunday": ["9:00 AM", "6:00 PM"], "wednesday": ["7:00 PM"] }
  website TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  photo_url TEXT,
  featured BOOLEAN DEFAULT FALSE,
  featured_tier TEXT CHECK (featured_tier IN ('basic', 'premium')), -- R199 = basic, R499 = premium
  verified BOOLEAN DEFAULT FALSE,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_churches_city ON churches(city);
CREATE INDEX idx_churches_province ON churches(province);
CREATE INDEX idx_churches_denomination ON churches(denomination);
CREATE INDEX idx_churches_featured ON churches(featured) WHERE featured = TRUE;
CREATE INDEX idx_churches_location ON churches USING GIST (point(lng, lat));

-- Full-text search
CREATE INDEX idx_churches_search ON churches USING GIN (
  to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(denomination, '') || ' ' || 
    COALESCE(city, '') || ' ' ||
    COALESCE(description, '')
  )
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON churches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Church submissions (pending approval)
CREATE TABLE church_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  denomination TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  service_times TEXT,
  submitter_name TEXT,
  submitter_email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample data (seed some Cape Town churches)
INSERT INTO churches (name, denomination, address, city, province, lat, lng, website, phone, slug, verified) VALUES
('St. George''s Cathedral', 'Anglican', '5 Wale St, Cape Town City Centre', 'Cape Town', 'Western Cape', -33.9249, 18.4241, 'https://www.sgcathedral.co.za/', '021 424 7360', 'st-georges-cathedral-cape-town', TRUE),
('Hillsong Church Cape Town', 'Pentecostal', 'Canal Walk Shopping Centre', 'Cape Town', 'Western Cape', -33.8925, 18.5067, 'https://hillsong.com/capetown/', '021 555 1234', 'hillsong-church-cape-town', TRUE),
('Rondebosch Baptist Church', 'Baptist', '12 Camp Ground Rd, Rondebosch', 'Cape Town', 'Western Cape', -33.9569, 18.4700, 'https://www.rbc.org.za/', '021 689 8980', 'rondebosch-baptist-church', TRUE),
('NG Kerk Stellenbosch Moedergemeente', 'Dutch Reformed', 'Die Braak, Stellenbosch', 'Stellenbosch', 'Western Cape', -33.9344, 18.8599, 'https://ngstellenbosch.co.za/', '021 887 0495', 'ng-kerk-stellenbosch', TRUE),
('Gateway Community Church', 'Non-Denominational', 'Corner of Jan Smuts & 8th Street, Hyde Park', 'Johannesburg', 'Gauteng', -26.1293, 28.0408, 'https://www.gatewaychurch.co.za/', '011 325 2222', 'gateway-community-church-jhb', TRUE);
