-- Add payroll tracking to attendance records
-- Run this in your Supabase SQL Editor

-- Add payroll_id column to track which payroll an attendance belongs to
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS payroll_id UUID REFERENCES payroll(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_payroll ON attendance(payroll_id);

-- This allows us to:
-- 1. Track which attendance records have been included in payroll
-- 2. Prevent double-paying employees
-- 3. Show visual indicator of paid vs unpaid attendance

