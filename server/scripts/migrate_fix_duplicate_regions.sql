-- Fix duplicate regions caused by whitespace or casing differences.
-- Run on both LOCAL and PRODUCTION databases.
-- Safe to re-run: uses conditional logic.

-- Step 1: trim whitespace from all existing region names and countries
UPDATE regions SET
    name    = TRIM(name),
    country = TRIM(country);

-- Step 2: merge duplicate regions (same city+country after normalization)
-- Reassign branches from the duplicate to the surviving region, then delete the duplicate.
DO $$
DECLARE
    dup RECORD;
    keep_id   UUID;
    delete_id UUID;
BEGIN
    FOR dup IN
        SELECT LOWER(TRIM(name)) AS norm_name, LOWER(TRIM(country)) AS norm_country
        FROM regions
        GROUP BY LOWER(TRIM(name)), LOWER(TRIM(country))
        HAVING COUNT(*) > 1
    LOOP
        -- pick the oldest (lowest id alphabetically) as the one to keep
        SELECT id INTO keep_id
        FROM regions
        WHERE LOWER(TRIM(name)) = dup.norm_name
          AND LOWER(TRIM(country)) = dup.norm_country
        ORDER BY created_at ASC, id ASC
        LIMIT 1;

        -- reassign branches from all other duplicates to the kept region
        UPDATE branches
        SET region_id = keep_id
        WHERE region_id IN (
            SELECT id FROM regions
            WHERE LOWER(TRIM(name)) = dup.norm_name
              AND LOWER(TRIM(country)) = dup.norm_country
              AND id != keep_id
        );

        -- delete the now-orphaned duplicate regions
        DELETE FROM regions
        WHERE LOWER(TRIM(name)) = dup.norm_name
          AND LOWER(TRIM(country)) = dup.norm_country
          AND id != keep_id;
    END LOOP;
END $$;
