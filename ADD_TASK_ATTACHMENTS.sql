-- Add task attachments functionality to HRMS
-- Run this script in your Supabase SQL Editor

-- Add attachment fields to tasks table (only the attachment fields)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- Add comments to document the new fields
COMMENT ON COLUMN tasks.attachment_url IS 'URL to the uploaded attachment file';
COMMENT ON COLUMN tasks.attachment_name IS 'Original filename of the attachment';
COMMENT ON COLUMN tasks.attachment_size IS 'File size in bytes';
COMMENT ON COLUMN tasks.attachment_type IS 'MIME type of the attachment';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;
