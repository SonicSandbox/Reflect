ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS weather JSONB;

COMMENT ON COLUMN journal_entries.weather IS 'Weather data for the day of the journal entry (temp, condition, location)';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'journal_entries'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE journal_entries;
    END IF;
END $$;
