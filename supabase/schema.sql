-- ============================================================
-- Marshmallow — Supabase Database Schema
-- Run this in the Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS (admins + photographers)
-- ============================================================
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  username    text unique not null,
  password_hash text not null,         -- bcrypt hash
  role        text not null default 'photographer',  -- 'admin' | 'photographer'
  full_name   text default '',
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- CHALET BOOKINGS
-- ============================================================
create table if not exists chalet_bookings (
  id              text primary key,
  date            text not null,
  hour            text default '',
  type            text default 'day',
  customer_name   text default '',
  phone           text default '',
  guests          text default '1',
  notes           text default '',
  price           numeric default 0,
  status          text default 'pending',   -- pending | confirmed | cancelled
  timestamp       text,
  total           numeric default 0,
  paid            numeric default 0,
  payment_status  text default 'unpaid',    -- unpaid | partial | half | paid
  created_at      timestamptz default now()
);

-- ============================================================
-- HALL BOOKINGS
-- ============================================================
create table if not exists hall_bookings (
  id              text primary key,
  date            text not null,
  hour            text default '',
  type            text default 'day',
  customer_name   text default '',
  phone           text default '',
  guests          text default '1',
  notes           text default '',
  price           numeric default 0,
  status          text default 'pending',
  timestamp       text,
  total           numeric default 0,
  paid            numeric default 0,
  payment_status  text default 'unpaid',
  created_at      timestamptz default now()
);

-- ============================================================
-- MABATH (OVERNIGHT) BOOKINGS
-- ============================================================
create table if not exists mabath_bookings (
  id              text primary key,
  date            text not null,
  hour            text default '',
  type            text default 'day',
  customer_name   text default '',
  phone           text default '',
  guests          text default '1',
  notes           text default '',
  price           numeric default 0,
  status          text default 'pending',
  timestamp       text,
  total           numeric default 0,
  paid            numeric default 0,
  payment_status  text default 'unpaid',
  created_at      timestamptz default now()
);

-- ============================================================
-- PHOTOGRAPHY BOOKINGS
-- ============================================================
create table if not exists photo_bookings (
  id                     text primary key,
  date                   text not null,
  hour                   text default '',
  customer_name          text default '',
  phone                  text default '',
  photographer_username  text default '',
  photographer_option    text default '',   -- place | own (customer's photographer choice)
  notes                  text default '',
  price                  numeric default 0,
  status                 text default 'pending',
  timestamp              text,
  total                  numeric default 0,
  paid                   numeric default 0,
  payment_status         text default 'unpaid',
  created_at             timestamptz default now()
);

-- If you already created photo_bookings before this field existed, run:
-- alter table photo_bookings add column if not exists photographer_option text default '';

-- ============================================================
-- SALON BOOKINGS
-- ============================================================
create table if not exists salon_bookings (
  id              text primary key,
  date            text default '',
  hour            text default '',
  type            text default '',      -- service name
  customer_name   text default '',
  phone           text default '',
  guests          text default '1',
  notes           text default '',
  price           numeric default 0,
  status          text default 'pending',
  timestamp       text,
  total           numeric default 0,
  paid            numeric default 0,
  payment_status  text default 'unpaid',
  created_at      timestamptz default now()
);

-- ============================================================
-- TESTIMONIALS
-- ============================================================
create table if not exists testimonials (
  id          text primary key default 't_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 4),
  name        text default '',
  rating      numeric default 5,
  comment     text default '',
  approved    boolean default false,
  date        text default '',
  image       text default '',
  created_at  timestamptz default now()
);

-- ============================================================
-- PRICING
-- ============================================================
create table if not exists pricing (
  id      serial primary key,
  idx     integer unique not null,
  service text not null,    -- chalet | hall | mabath | photography
  type    text not null,    -- day | night | hour | overnight | etc.
  day     text not null,    -- * (all days) | 0=Sun | 1=Mon | ... | 6=Sat
  price   numeric not null default 0
);

-- ============================================================
-- BACKUPS LOG
-- ============================================================
create table if not exists backups (
  id         serial primary key,
  name       text,
  date       text,
  link       text,
  created_at timestamptz default now()
);

-- ============================================================
-- BROWSER PUSH SUBSCRIPTIONS
-- ============================================================
-- The endpoint identifies a browser/device. The API stores only
-- the normalized phone needed to match a booking confirmation.
create table if not exists push_subscriptions (
  endpoint         text primary key,
  phone_normalized text not null,
  p256dh           text not null,
  auth             text not null,
  user_agent       text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ============================================================
-- CLOSED DAYS (admin blocks booking on specific dates)
-- ============================================================
create table if not exists closed_days (
  date       text primary key,
  message    text default '',
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security — disable for service role (backend uses service key)
-- ============================================================
alter table users              disable row level security;
alter table chalet_bookings    disable row level security;
alter table hall_bookings      disable row level security;
alter table mabath_bookings    disable row level security;
alter table photo_bookings     disable row level security;
alter table salon_bookings     disable row level security;
alter table testimonials       disable row level security;
alter table pricing            disable row level security;
alter table backups            disable row level security;
alter table push_subscriptions disable row level security;
alter table closed_days         disable row level security;

-- ============================================================
-- DEFAULT ADMIN USER
-- password is: admin123  (CHANGE THIS IMMEDIATELY after first login)
-- Hash generated with bcrypt cost 10
-- To generate a new hash: https://bcrypt-generator.com/ (10 rounds)
-- ============================================================
insert into users (username, password_hash, role, full_name, active)
values (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- admin123
  'admin',
  'المدير',
  true
) on conflict (username) do nothing;

-- ============================================================
-- SAMPLE PRICING DATA
-- ============================================================
insert into pricing (idx, service, type, day, price) values
  (1,  'chalet',      'day',       '*', 350),
  (2,  'chalet',      'overnight', '*', 500),
  (3,  'hall',        'hour',      '*', 100),
  (4,  'hall',        'hour',      '5', 120),   -- Friday
  (5,  'hall',        'hour',      '6', 120),   -- Saturday
  (6,  'mabath',      'day',       '*', 300),
  (7,  'mabath',      'night',     '*', 400),
  (8,  'photography', 'hour',      '*', 150)
on conflict (idx) do nothing;

-- ============================================================
-- Done! Your database is ready.
-- ============================================================
