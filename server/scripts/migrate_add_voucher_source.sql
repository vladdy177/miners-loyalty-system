-- Adds a source column to user_vouchers to distinguish purchased vs gifted vouchers.
-- 'purchased' = user spent points in the shop
-- 'gifted'    = assigned by admin via bulk campaign (no points deducted)
-- Run on both LOCAL and PRODUCTION databases.

ALTER TABLE user_vouchers
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'gifted';

-- Mark existing shop purchases based on point_logs evidence.
-- If a negative point_log exists for this user around the time the voucher was created,
-- we consider it purchased. For existing data we play it safe and leave all as 'gifted'
-- since we cannot reliably distinguish retroactively.
