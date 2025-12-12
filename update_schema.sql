-- Create a migration to add the missing column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'keyword_context') THEN
        ALTER TABLE articles ADD COLUMN keyword_context TEXT DEFAULT '';
    END IF;
END $$;
