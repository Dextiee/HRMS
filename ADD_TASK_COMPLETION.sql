-- Add task completion status to tasks table
-- Run this in your Supabase SQL Editor

-- Add is_completed column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false;

-- Add completed_at timestamp column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(is_completed);

-- Optional: Add a comment to document the columns
COMMENT ON COLUMN tasks.is_completed IS 'Whether the task has been marked as complete';
COMMENT ON COLUMN tasks.completed_at IS 'Timestamp when the task was marked as complete';

