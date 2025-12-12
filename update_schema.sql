-- Create a migration to add the missing column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'keyword_context') THEN
        ALTER TABLE articles ADD COLUMN keyword_context TEXT DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'keyword_library' AND column_name = 'translations') THEN
        ALTER TABLE keyword_library ADD COLUMN translations JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
