-- Remove Appointments Table from HRMS Database
-- Run this script in your Supabase SQL Editor

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;

-- Drop the function (only if it's not used by other tables)
-- DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop the RLS policies
DROP POLICY IF EXISTS "authenticated_users_select_appointments" ON appointments;
DROP POLICY IF EXISTS "authenticated_users_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "authenticated_users_update_appointments" ON appointments;
DROP POLICY IF EXISTS "authenticated_users_delete_appointments" ON appointments;

-- Drop the indexes
DROP INDEX IF EXISTS idx_appointments_employee;
DROP INDEX IF EXISTS idx_appointments_date;
DROP INDEX IF EXISTS idx_appointments_status;
DROP INDEX IF EXISTS idx_appointments_google_sync;

-- Finally, drop the table
DROP TABLE IF EXISTS appointments;
