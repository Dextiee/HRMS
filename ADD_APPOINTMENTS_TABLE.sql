-- Add Appointments Table to Existing HRMS Database
-- Run this script in your Supabase SQL Editor

-- Create appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_name TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    assigned_employee UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    appointment_status TEXT NOT NULL DEFAULT 'Active' CHECK (appointment_status IN ('Active', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled')),
    appointment_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_appointments_employee ON appointments(assigned_employee);
CREATE INDEX idx_appointments_date ON appointments(appointment_date DESC);
CREATE INDEX idx_appointments_status ON appointments(appointment_status);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "authenticated_users_select_appointments" ON appointments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert_appointments" ON appointments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update_appointments" ON appointments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_delete_appointments" ON appointments
    FOR DELETE USING (auth.role() = 'authenticated');

-- Optional: Insert sample appointment data for testing
-- INSERT INTO appointments (appointment_name, appointment_date, appointment_time, assigned_employee, appointment_status, appointment_info) VALUES
-- ('Client Meeting', '2024-12-20', '10:00:00', (SELECT id FROM employees LIMIT 1), 'Active', 'Quarterly review meeting with client'),
-- ('Team Interview', '2024-12-21', '14:30:00', (SELECT id FROM employees LIMIT 1), 'Confirmed', 'Interview for new developer position'),
-- ('Project Review', '2024-12-22', '09:00:00', (SELECT id FROM employees LIMIT 1), 'Completed', 'Monthly project status review');
