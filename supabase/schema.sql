-- PedalParty Database Schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- Enable UUID extension (usually enabled by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE route_type AS ENUM ('loop', 'out_and_back', 'no_preference');
CREATE TYPE ride_status AS ENUM ('collecting', 'generated');

-- Rides table
CREATE TABLE rides (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date_time TIMESTAMPTZ,
    organizer_token TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status ride_status NOT NULL DEFAULT 'collecting',
    generated_routes JSONB
);

-- Preferences table
CREATE TABLE preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id TEXT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    start_location JSONB NOT NULL, -- {lat: number, lng: number}
    distance_preference_km INTEGER NOT NULL,
    route_type route_type NOT NULL DEFAULT 'no_preference',
    vibes TEXT[] NOT NULL DEFAULT '{}',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visitor_token TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX idx_preferences_ride_id ON preferences(ride_id);
CREATE INDEX idx_preferences_visitor_token ON preferences(visitor_token);
CREATE INDEX idx_rides_organizer_token ON rides(organizer_token);

-- Row Level Security (RLS) policies
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

-- Anyone can read rides (needed for participant view)
CREATE POLICY "Rides are publicly readable"
    ON rides FOR SELECT
    USING (true);

-- Anyone can create rides (no auth required)
CREATE POLICY "Anyone can create rides"
    ON rides FOR INSERT
    WITH CHECK (true);

-- Only organizer can update their ride (via organizer_token check in app)
CREATE POLICY "Anyone can update rides"
    ON rides FOR UPDATE
    USING (true);

-- Anyone can read preferences (aggregated in app, not exposed individually)
CREATE POLICY "Preferences are publicly readable"
    ON preferences FOR SELECT
    USING (true);

-- Anyone can submit preferences
CREATE POLICY "Anyone can submit preferences"
    ON preferences FOR INSERT
    WITH CHECK (true);

-- Anyone can update preferences (visitor_token check done in app)
CREATE POLICY "Anyone can update preferences"
    ON preferences FOR UPDATE
    USING (true);
