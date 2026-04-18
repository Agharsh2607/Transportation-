-- ============================================================
-- Transit Tracking System — Initial Schema Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Routes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
  id            VARCHAR(64)  PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  -- Polyline stored as JSONB array of {lat, lng} objects
  -- e.g. [{"lat": 51.5, "lng": -0.1}, ...]
  polyline      JSONB,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_active ON routes (active);

-- ─── Stops ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stops (
  id            VARCHAR(64)  PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stops_lat_lng ON stops (lat, lng);

-- ─── Route Stops (join table with ordering) ──────────────────
CREATE TABLE IF NOT EXISTS route_stops (
  id                    SERIAL       PRIMARY KEY,
  route_id              VARCHAR(64)  NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_id               VARCHAR(64)  NOT NULL REFERENCES stops(id)  ON DELETE CASCADE,
  stop_order            INTEGER      NOT NULL,
  distance_from_prev_km DOUBLE PRECISION DEFAULT 0,
  UNIQUE (route_id, stop_id),
  UNIQUE (route_id, stop_order)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON route_stops (route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_stop_id  ON route_stops (stop_id);

-- ─── Vehicles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id                  VARCHAR(64)  PRIMARY KEY,
  registration_number VARCHAR(32)  NOT NULL UNIQUE,
  model               VARCHAR(128) NOT NULL,
  capacity            INTEGER      NOT NULL DEFAULT 40,
  route_id            VARCHAR(64)  REFERENCES routes(id) ON DELETE SET NULL,
  driver_name         VARCHAR(128),
  status              VARCHAR(32)  NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_route_id ON vehicles (route_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status   ON vehicles (status);

-- ─── Location Pings ──────────────────────────────────────────
-- NOTE: In production, partition this table by day using PostgreSQL
-- declarative partitioning:
--   PARTITION BY RANGE (recorded_at)
-- with daily child tables created automatically via pg_partman.
-- This keeps query performance fast as the table grows to billions of rows.
CREATE TABLE IF NOT EXISTS location_pings (
  id              BIGSERIAL        PRIMARY KEY,
  vehicle_id      VARCHAR(64)      NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  speed_kmh       DOUBLE PRECISION NOT NULL DEFAULT 0,
  heading         DOUBLE PRECISION NOT NULL DEFAULT 0,
  seq             INTEGER          NOT NULL DEFAULT 0,
  replayed        BOOLEAN          NOT NULL DEFAULT FALSE,
  signal_strength VARCHAR(16)      NOT NULL DEFAULT 'good',
  recorded_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_pings_vehicle_id   ON location_pings (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_location_pings_recorded_at  ON location_pings (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_pings_vehicle_seq  ON location_pings (vehicle_id, seq);
-- Composite index for history queries
CREATE INDEX IF NOT EXISTS idx_location_pings_vehicle_time ON location_pings (vehicle_id, recorded_at DESC);

-- ─── ETA Records ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eta_records (
  id            BIGSERIAL        PRIMARY KEY,
  vehicle_id    VARCHAR(64)      NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_id      VARCHAR(64)      NOT NULL REFERENCES routes(id)   ON DELETE CASCADE,
  stop_id       VARCHAR(64)      NOT NULL REFERENCES stops(id)    ON DELETE CASCADE,
  predicted_min INTEGER          NOT NULL,
  actual_min    INTEGER,
  error_min     INTEGER,
  hour_bucket   SMALLINT         NOT NULL,  -- 0-23
  day_of_week   SMALLINT         NOT NULL,  -- 0-6
  confidence    VARCHAR(16)      NOT NULL DEFAULT 'medium',
  arrived_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eta_records_route_id    ON eta_records (route_id);
CREATE INDEX IF NOT EXISTS idx_eta_records_vehicle_id  ON eta_records (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_eta_records_stop_id     ON eta_records (stop_id);
-- Index for historical speed queries
CREATE INDEX IF NOT EXISTS idx_eta_records_hist        ON eta_records (route_id, hour_bucket, day_of_week);

-- ============================================================
-- Seed Data
-- ============================================================

-- Routes
INSERT INTO routes (id, name, description, active, polyline) VALUES
  ('route-1', 'City Centre Loop',
   'Circular route through the city centre stopping at major landmarks.',
   TRUE,
   '[{"lat":51.5074,"lng":-0.1278},{"lat":51.5080,"lng":-0.1250},{"lat":51.5090,"lng":-0.1220},{"lat":51.5100,"lng":-0.1200},{"lat":51.5095,"lng":-0.1230},{"lat":51.5085,"lng":-0.1260}]'
  ),
  ('route-2', 'Airport Express',
   'Direct service from the city centre to the international airport.',
   TRUE,
   '[{"lat":51.5074,"lng":-0.1278},{"lat":51.5150,"lng":-0.1400},{"lat":51.5250,"lng":-0.1600},{"lat":51.5350,"lng":-0.1800},{"lat":51.4775,"lng":-0.4614}]'
  )
ON CONFLICT (id) DO NOTHING;

-- Stops
INSERT INTO stops (id, name, lat, lng, description) VALUES
  ('stop-1', 'Central Station',       51.5074, -0.1278, 'Main railway and bus interchange'),
  ('stop-2', 'Market Square',         51.5090, -0.1220, 'Town centre market area'),
  ('stop-3', 'University Campus',     51.5100, -0.1200, 'Main university entrance'),
  ('stop-4', 'Riverside Park',        51.5085, -0.1260, 'Park and ride facility'),
  ('stop-5', 'International Airport', 51.4775, -0.4614, 'Terminal 1 & 2 drop-off')
ON CONFLICT (id) DO NOTHING;

-- Route Stops — Route 1 (City Centre Loop)
INSERT INTO route_stops (route_id, stop_id, stop_order, distance_from_prev_km) VALUES
  ('route-1', 'stop-1', 1, 0.0),
  ('route-1', 'stop-2', 2, 0.8),
  ('route-1', 'stop-3', 3, 0.4),
  ('route-1', 'stop-4', 4, 0.6),
  ('route-1', 'stop-1', 1, 0.0)  -- loop back (handled by UNIQUE constraint, skip if conflict)
ON CONFLICT DO NOTHING;

-- Route Stops — Route 2 (Airport Express)
INSERT INTO route_stops (route_id, stop_id, stop_order, distance_from_prev_km) VALUES
  ('route-2', 'stop-1', 1, 0.0),
  ('route-2', 'stop-5', 2, 22.5)
ON CONFLICT DO NOTHING;

-- Vehicles
INSERT INTO vehicles (id, registration_number, model, capacity, route_id, driver_name, status) VALUES
  ('vehicle-1', 'TFL-001-A', 'Volvo B5LH Double Decker', 87, 'route-1', 'James Carter',   'active'),
  ('vehicle-2', 'TFL-002-B', 'Alexander Dennis Enviro400', 75, 'route-1', 'Sarah Mitchell', 'active'),
  ('vehicle-3', 'TFL-003-C', 'Mercedes-Benz Citaro',      45, 'route-2', 'David Okafor',   'active')
ON CONFLICT (id) DO NOTHING;
