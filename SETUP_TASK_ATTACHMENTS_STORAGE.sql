-- Create storage bucket for task attachments
-- Run this script in your Supabase SQL Editor

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true);

-- Set up RLS policies for the storage bucket
CREATE POLICY "authenticated_users_select_attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert_attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update_attachments" ON storage.objects
FOR UPDATE USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_delete_attachments" ON storage.objects
FOR DELETE USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'task-attachments';
