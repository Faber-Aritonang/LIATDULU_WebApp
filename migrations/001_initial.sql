-- Migration: 001_initial_schema.sql
-- Created: 2026-01-04
-- Description: Initial database schema for LIATDULU Virtual Fitting Room

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  name        VARCHAR(255),
  image       TEXT,
  email_verified TIMESTAMP,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Fitting history table
CREATE TABLE IF NOT EXISTS fitting_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  result_url  TEXT NOT NULL,
  blob_path   TEXT NOT NULL,
  ratio       VARCHAR(10) NOT NULL,
  product_count INTEGER NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_history_user_id ON fitting_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON fitting_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add foreign key constraint
ALTER TABLE fitting_history 
  ADD CONSTRAINT fk_fitting_history_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Insert a test user (for development only)
-- INSERT INTO users (email, name, image) 
-- VALUES ('test@example.com', 'Test User', 'https://example.com/avatar.png')
-- ON CONFLICT (email) DO NOTHING;