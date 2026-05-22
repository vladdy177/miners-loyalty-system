-- Full database setup from scratch
-- Run: psql -U postgres -d miners_loyalty -f scripts/setup.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---- Geographic hierarchy ----

CREATE TABLE IF NOT EXISTS regions (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name    VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS branches (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    name      VARCHAR(100) NOT NULL,
    address   TEXT,
    is_active BOOLEAN DEFAULT true
);

-- ---- Users ----

CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) UNIQUE NOT NULL,
    first_name     VARCHAR(100),
    last_name      VARCHAR(100),
    gender         VARCHAR(20),
    birth_date     DATE,
    home_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    password_hash  TEXT
);

CREATE TABLE IF NOT EXISTS loyalty_cards (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    points_balance INTEGER DEFAULT 0,
    qr_code_token  VARCHAR(255) UNIQUE,
    tier           VARCHAR(50) DEFAULT 'STANDARD',
    last_sync_at   TIMESTAMP WITH TIME ZONE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---- Vouchers ----

CREATE TABLE IF NOT EXISTS voucher_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    cost                INTEGER NOT NULL,
    discount_type       VARCHAR(20),
    discount_value      NUMERIC(10,2),
    image_url           TEXT,
    is_crew_only        BOOLEAN DEFAULT false,
    valid_duration_days INTEGER DEFAULT 30
);

CREATE TABLE IF NOT EXISTS user_vouchers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES voucher_templates(id) ON DELETE SET NULL,
    status      VARCHAR(20) DEFAULT 'active',
    source      VARCHAR(20) NOT NULL DEFAULT 'gifted',
    expires_at  TIMESTAMP WITH TIME ZONE,
    redeemed_at TIMESTAMP WITH TIME ZONE
);

-- ---- Audit ----

CREATE TABLE IF NOT EXISTS point_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE,
    amount          INTEGER NOT NULL,
    reason          VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---- Admin ----

CREATE TABLE IF NOT EXISTS admins (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default admin account (password: password123)
INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2a$12$lB7Zxbi.FhfuPOC3VuPCC.zUsi3FtQxMkwIClt.MtJ0ZG.obnw83W')
ON CONFLICT (username) DO NOTHING;
