-- Add emotions and topics columns to journal_entries table
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS emotions TEXT[],
ADD COLUMN IF NOT EXISTS topics TEXT[];

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS journal_entries_emotions_idx ON journal_entries USING GIN(emotions);
CREATE INDEX IF NOT EXISTS journal_entries_topics_idx ON journal_entries USING GIN(topics);
