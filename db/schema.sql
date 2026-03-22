-- PostgreSQL schema for industrial production checklist system (Supabase-compatible)

CREATE TYPE material_category AS ENUM ('raw', 'fabrication', 'purchase');

CREATE TABLE IF NOT EXISTS machines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  category material_category NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock (
  id SERIAL PRIMARY KEY,
  material_name TEXT NOT NULL UNIQUE,
  available_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  minimum_threshold NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
