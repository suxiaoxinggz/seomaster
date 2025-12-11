-- NEW: Normalized Tables for Image Storage & Keyword Linking
-- Updated to use TEXT for foreign keys matching the application's string-based ID generation (e.g., 'article-123').

-- 1. Images Table
create table if not exists images (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  article_id text, -- Changed from UUID to TEXT to match 'article-123' format
  storage_provider text check (storage_provider in ('r2', 'supabase', 'base64_fallback', 'external')),
  storage_path text,
  public_url text not null,
  prompt text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Normalized Keywords Table
create table if not exists keywords (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  sub_project_id text, -- Changed from UUID to TEXT to match 'subproj-123' format
  text text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Article Keywords Intersection
create table if not exists article_keywords (
  article_id text, -- Changed from UUID to TEXT
  keyword_id uuid references keywords(id) on delete cascade,
  primary key (article_id, keyword_id)
);

-- Enable RLS
alter table images enable row level security;
alter table keywords enable row level security;
alter table article_keywords enable row level security;

-- Policies
do $$ begin
  if not exists (select from pg_policies where policyname = 'Users can view own images') then
    create policy "Users can view own images" on images for all using (auth.uid() = user_id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can view own keywords') then
    create policy "Users can view own keywords" on keywords for all using (auth.uid() = user_id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can view own article keywords') then
    -- Simplified policy since we can't easily join on text ID without casting, 
    -- and RLS on junction tables is often just "if I can see the keyword, I can see the link"
    create policy "Users can view own article keywords" on article_keywords for select using (
      exists (select 1 from keywords where keywords.id = article_keywords.keyword_id and keywords.user_id = auth.uid())
    );
  end if;
end $$;

-- 4. Localization Enhancements (Update)
-- Add columns to existing articles table (Self-Reference)
-- 'source_article_id' is TEXT because 'articles.id' is TEXT (e.g. 'article-123')
alter table articles add column if not exists language text;
alter table articles add column if not exists source_article_id text; 
-- Optional: Index for performance
create index if not exists idx_articles_source_id on articles(source_article_id);

