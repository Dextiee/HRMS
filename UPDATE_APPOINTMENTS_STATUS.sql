-- Update existing appointments table to change 'Scheduled' to 'Active'
-- Run this script in your Supabase SQL Editor

-- First, update any existing 'Scheduled' appointments to 'Active'
UPDATE appointments 
SET appointment_status = 'Active' 
WHERE appointment_status = 'Scheduled';

-- Update the default value for the column
ALTER TABLE appointments 
ALTER COLUMN appointment_status SET DEFAULT 'Active';

-- Update the check constraint to use 'Active' instead of 'Scheduled'
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_appointment_status_check;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_appointment_status_check 
CHECK (appointment_status IN ('Active', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled'));

-- Verify the changes
SELECT 
    appointment_status, 
    COUNT(*) as count 
FROM appointments 
GROUP BY appointment_status 
ORDER BY appointment_status;
