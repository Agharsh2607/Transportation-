-- Create vehicle_status table for real-time tracking
CREATE TABLE IF NOT EXISTS vehicle_status (
    vehicle_id VARCHAR(50) PRIMARY KEY,
    bus_number VARCHAR(20) NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5, 2) DEFAULT 0,
    heading DECIMAL(5, 2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'live',
    route_id VARCHAR(50),
    driver_name VARCHAR(100),
    accuracy DECIMAL(6, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_status_last_updated ON vehicle_status(last_updated);
CREATE INDEX IF NOT EXISTS idx_vehicle_status_status ON vehicle_status(status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vehicle_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicle_status_updated_at
    BEFORE UPDATE ON vehicle_status
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_status_updated_at();