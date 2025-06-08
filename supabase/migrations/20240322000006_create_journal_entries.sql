CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  date DATE NOT NULL,
  mood_score INTEGER,
  follow_up_question TEXT,
  follow_up_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS journal_entries_user_id_idx ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS journal_entries_date_idx ON journal_entries(date);
CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_user_date_idx ON journal_entries(user_id, date);

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