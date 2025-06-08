-- Add follow_up_question and follow_up_response columns if they don't exist
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS follow_up_question TEXT,
ADD COLUMN IF NOT EXISTS follow_up_response TEXT;
