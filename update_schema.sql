-- Create a migration to add the missing column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'keyword_context') THEN
        ALTER TABLE articles ADD COLUMN keyword_context TEXT DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'keyword_library' AND column_name = 'translations') THEN
        ALTER TABLE keyword_library ADD COLUMN translations JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Articles Table Updates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'model_used') THEN
        ALTER TABLE articles ADD COLUMN model_used TEXT DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'published_destinations') THEN
        ALTER TABLE articles ADD COLUMN published_destinations JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'project_id') THEN
        ALTER TABLE articles RENAME COLUMN project_id TO parent_project_id;
    END IF;
END $$;
