-- Migration for PRODUCTION database (Render)
-- Run BEFORE deploying the latest backend changes.

-- CRITICAL: required by walletService.js — sync will fail without this column
ALTER TABLE loyalty_cards
    ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Add password_hash to users for consistency with local schema (not used yet, reserved for future auth)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Update admin password to bcrypt hash (password: password123)
UPDATE admins
SET password_hash = '$2a$12$lB7Zxbi.FhfuPOC3VuPCC.zUsi3FtQxMkwIClt.MtJ0ZG.obnw83W'
WHERE username = 'admin';
