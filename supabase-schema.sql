-- CampusFind AI — Supabase PostgreSQL Database Schema
-- Run this script in your Supabase SQL Editor (https://app.supabase.com -> Project -> SQL Editor)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  college_id TEXT NOT NULL DEFAULT 'default-college',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  otp_code TEXT,
  otp_expires BIGINT,
  created_at BIGINT NOT NULL
);

-- 2. Lost Items Table
CREATE TABLE IF NOT EXISTS public.lost_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT,
  brand TEXT,
  model TEXT,
  identifying_features TEXT,
  lost_date TEXT NOT NULL,
  lost_time TEXT,
  lost_location TEXT NOT NULL,
  additional_details TEXT,
  estimated_value NUMERIC,
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  reward_status TEXT NOT NULL DEFAULT 'no_reward',
  contact_preference TEXT NOT NULL DEFAULT 'platform',
  status TEXT NOT NULL DEFAULT 'active',
  image TEXT,
  created_at BIGINT NOT NULL
);

-- 3. Found Items Table
CREATE TABLE IF NOT EXISTS public.found_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT,
  brand TEXT,
  model TEXT,
  identifying_features TEXT,
  found_date TEXT NOT NULL,
  found_time TEXT,
  found_location TEXT NOT NULL,
  current_location TEXT,
  additional_details TEXT,
  contact_preference TEXT NOT NULL DEFAULT 'platform',
  status TEXT NOT NULL DEFAULT 'active',
  image TEXT,
  created_at BIGINT NOT NULL
);

-- 4. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY,
  lost_item_id TEXT NOT NULL REFERENCES public.lost_items(id) ON DELETE CASCADE,
  found_item_id TEXT NOT NULL REFERENCES public.found_items(id) ON DELETE CASCADE,
  text_score DOUBLE PRECISION NOT NULL,
  category_score DOUBLE PRECISION NOT NULL,
  color_score DOUBLE PRECISION NOT NULL,
  brand_score DOUBLE PRECISION NOT NULL,
  location_score DOUBLE PRECISION NOT NULL,
  time_score DOUBLE PRECISION NOT NULL,
  overall_score DOUBLE PRECISION NOT NULL,
  reasons TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'possible_match',
  created_at BIGINT NOT NULL,
  CONSTRAINT unique_match_pair UNIQUE (lost_item_id, found_item_id)
);

-- 5. Verifications Table
CREATE TABLE IF NOT EXISTS public.verifications (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL
);

-- 6. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_lost_status ON public.lost_items(status);
CREATE INDEX IF NOT EXISTS idx_found_status ON public.found_items(status);
CREATE INDEX IF NOT EXISTS idx_matches_lost ON public.matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_found ON public.matches(found_item_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Disable Row Level Security (RLS) or add standard policies if needed
-- Since authentication is handled via JWT session tokens in Next.js backend routes,
-- table access is securely scoped at the API route level.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.found_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
