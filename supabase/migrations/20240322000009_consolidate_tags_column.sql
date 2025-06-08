-- Remove emotions and topics columns and add single tags column
ALTER TABLE journal_entries 
DROP COLUMN IF EXISTS emotions,
DROP COLUMN IF EXISTS topics,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create index for the new tags column
CREATE INDEX IF NOT EXISTS journal_entries_tags_idx ON journal_entries USING GIN(tags);

-- Drop old indexes if they exist
DROP INDEX IF EXISTS journal_entries_emotions_idx;
DROP INDEX IF EXISTS journal_entries_topics_idx;
