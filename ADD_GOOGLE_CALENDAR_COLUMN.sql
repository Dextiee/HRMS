-- Add Google Calendar Event ID column to existing appointments table
-- Run this script in your Supabase SQL Editor

-- Add google_calendar_event_id column to appointments table
ALTER TABLE appointments 
ADD COLUMN google_calendar_event_id TEXT;

-- Add index for better performance when querying by Google Calendar event ID
CREATE INDEX idx_appointments_google_calendar_event ON appointments(google_calendar_event_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name = 'google_calendar_event_id';
