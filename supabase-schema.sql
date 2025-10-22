-- HRMS Database Schema for Supabase
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    date_hired DATE NOT NULL,
    employment_status TEXT NOT NULL DEFAULT 'Active' CHECK (employment_status IN ('Active', 'On Leave', 'Terminated')),
    salary_rate NUMERIC NOT NULL CHECK (salary_rate >= 0),
    salary_type TEXT NOT NULL DEFAULT 'Monthly' CHECK (salary_type IN ('Monthly', 'Daily')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
    hours_worked NUMERIC NOT NULL DEFAULT 0 CHECK (hours_worked >= 0 AND hours_worked <= 24),
    payroll_id UUID REFERENCES payroll(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Payroll table
CREATE TABLE payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    total_working_days INT NOT NULL DEFAULT 0 CHECK (total_working_days >= 0),
    total_absent_days INT NOT NULL DEFAULT 0 CHECK (total_absent_days >= 0),
    total_hours NUMERIC NOT NULL DEFAULT 0 CHECK (total_hours >= 0),
    generated_on TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    project_details TEXT NOT NULL,
    project_created TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_name TEXT NOT NULL,
    task_details TEXT NOT NULL,
    task_created TIMESTAMPTZ DEFAULT NOW(),
    task_deadline DATE NOT NULL,
    assigned_to UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    CHECK (task_deadline >= CURRENT_DATE)
);

-- ============================================
-- INDEXES for Performance
-- ============================================

CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date DESC);
CREATE INDEX idx_attendance_payroll ON attendance(payroll_id);
CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_payroll_generated ON payroll(generated_on DESC);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_deadline ON tasks(task_deadline);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_status ON employees(employment_status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Employees policies
CREATE POLICY "authenticated_users_select_employees" ON employees
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert_employees" ON employees
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update_employees" ON employees
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_delete_employees" ON employees
    FOR DELETE USING (auth.role() = 'authenticated');

-- Attendance policies
CREATE POLICY "authenticated_users_select_attendance" ON attendance
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert_attendance" ON attendance
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update_attendance" ON attendance
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_delete_attendance" ON attendance
    FOR DELETE USING (auth.role() = 'authenticated');

-- Payroll policies
CREATE POLICY "authenticated_users_select_payroll" ON payroll
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert_payroll" ON payroll
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update_payroll" ON payroll
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_delete_payroll" ON payroll
    FOR DELETE USING (auth.role() = 'authenticated');

-- Projects policies
CREATE POLICY "authenticated_users_select_projects" ON projects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert_projects" ON projects
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update_projects" ON projects
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_delete_projects" ON projects
    FOR DELETE USING (auth.role() = 'authenticated');

-- Tasks policies
CREATE POLICY "authenticated_users_select_tasks" ON tasks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert_tasks" ON tasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update_tasks" ON tasks
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_delete_tasks" ON tasks
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment below to insert sample data

-- INSERT INTO employees (name, address, contact_number, email, date_hired, employment_status, salary_rate) VALUES
-- ('John Doe', '123 Main St, City', '+1234567890', 'john.doe@example.com', '2024-01-15', 'Active', 5000.00),
-- ('Jane Smith', '456 Oak Ave, Town', '+1234567891', 'jane.smith@example.com', '2024-02-01', 'Active', 5500.00),
-- ('Bob Johnson', '789 Pine Rd, Village', '+1234567892', 'bob.johnson@example.com', '2024-03-10', 'Active', 4800.00);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify the schema was created successfully

-- Check tables
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS status
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

