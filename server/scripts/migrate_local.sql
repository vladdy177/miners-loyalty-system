-- Migration for LOCAL database
-- Run once: brings local schema in sync with production target

-- Remove columns that were dropped from production and are no longer used
ALTER TABLE loyalty_cards DROP COLUMN IF EXISTS apple_pass_id;
ALTER TABLE loyalty_cards DROP COLUMN IF EXISTS google_object_id;

-- Add created_at to loyalty_cards for consistency with production
ALTER TABLE loyalty_cards
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update admin password to bcrypt hash (password: password123)
UPDATE admins
SET password_hash = '$2a$12$lB7Zxbi.FhfuPOC3VuPCC.zUsi3FtQxMkwIClt.MtJ0ZG.obnw83W'
WHERE username = 'admin';
