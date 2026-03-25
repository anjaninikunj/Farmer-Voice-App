-- Create Farms Table
CREATE TABLE IF NOT EXISTS farms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Seasons Table
CREATE TABLE IF NOT EXISTS seasons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- 'Winter', 'Summer', 'Monsoon'
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Expenses (Core Data Table)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id),
    season_id INTEGER REFERENCES seasons(id),
    category VARCHAR(100) NOT NULL, -- Fertilizer, Labour, Purchase, Machine
    activity_type VARCHAR(100), -- Ropari (Planting), Nidamar (Weeding), Spraying, etc.
    item_name VARCHAR(100), -- Urea, NPK, Medicine Name, Seed Name
    description TEXT,
    worker_count INTEGER,
    vigha_count DECIMAL(10, 2), -- Land area
    pump_count INTEGER, -- Number of sprays
    bag_count INTEGER, -- Number of fertilizer bags
    rate DECIMAL(15, 2),
    unit VARCHAR(50), -- bag, vigha, person, pump, kg, liter
    total_amount DECIMAL(15, 2),
    notes TEXT,
    date DATE DEFAULT CURRENT_DATE,
    voice_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial seasons
INSERT INTO seasons (name, is_active) VALUES 
('Winter', false),
('Summer', true),
('Monsoon', false);

-- Seed a sample farm for testing
INSERT INTO farms (name, location) VALUES ('Ambe Farm', 'Default Location');
INSERT INTO farms (name, location) VALUES ('Nikunj Farm', 'Default Location');
