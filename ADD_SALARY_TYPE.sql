-- Add salary_type column to existing employees table
-- Run this in your Supabase SQL Editor

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS salary_type TEXT NOT NULL DEFAULT 'Monthly' 
CHECK (salary_type IN ('Monthly', 'Daily'));

-- Update any NULL values to 'Monthly' (just in case)
UPDATE employees 
SET salary_type = 'Monthly' 
WHERE salary_type IS NULL;

