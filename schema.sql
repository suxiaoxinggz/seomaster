-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Projects
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Keyword Library (Sub Projects)
create table if not exists keyword_library (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  "parentProjectId" uuid references projects(id) on delete cascade not null,
  "savedAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "modelUsed" text not null,
  keywords jsonb default '[]'::jsonb, -- Store complex nested keyword structure as JSON
  translations jsonb default '{}'::jsonb,
  "publishedDestinations" jsonb default '[]'::jsonb
);

-- 3. Articles
create table if not exists articles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  content text default '',
  "keywordContext" text,
  "parentProjectId" uuid, -- optional link
  "subProjectId" uuid, -- optional link
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "modelUsed" text,
  "publishedDestinations" jsonb default '[]'::jsonb
);

-- 4. Models (Custom User Models)
create table if not exists models (
  id text primary key, -- user provided ID or generated
  user_id uuid references auth.users not null,
  nickname text not null,
  "apiKey" text not null,
  "baseURL" text,
  version text,
  "supportsWebSearch" boolean default false,
  type text not null, -- ModelProvider enum
  "apiProvider" text not null, -- ApiProvider enum
  "isDefault" boolean default false
);

-- 5. Posts to Publish (Formatted Posts)
create table if not exists posts_to_publish (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  "htmlContent" text,
  "markdownContent" text,
  "keywordContext" text,
  "usedImages" jsonb default '[]'::jsonb,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "parentProjectId" uuid,
  "subProjectId" uuid,
  "publishedDestinations" jsonb default '[]'::jsonb
);

-- 6. Publishing Channels
create table if not exists publishing_channels (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  platform text not null,
  config jsonb default '{}'::jsonb,
  "isDefault" boolean default false
);

-- 7. Publishing Queue
create table if not exists publishing_queue (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  "sourceId" uuid not null,
  "sourceType" text not null, -- 'article' | 'post' | 'image_set'
  name text not null,
  status text not null, -- 'queued' | 'publishing' | 'success' | 'failed'
  log text,
  data jsonb -- Snapshot of data to be published
);

-- 8. Saved Image Sets
create table if not exists saved_image_sets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  "searchTermOrPrompt" text,
  images jsonb default '[]'::jsonb,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "parentProjectId" uuid,
  "subProjectId" uuid,
  "publishedDestinations" jsonb default '[]'::jsonb
);

-- 9. SEO Snapshots (New)
create table if not exists seo_snapshots (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  type text not null, -- 'market_intelligence' | 'serp_analysis' | 'ai_visibility'
  query text not null,
  parameters jsonb default '{}'::jsonb,
  data jsonb default '{}'::jsonb,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  tags text[] default array[]::text[]
);

-- Enable RLS (Row Level Security) on all tables
alter table projects enable row level security;
alter table keyword_library enable row level security;
alter table articles enable row level security;
alter table models enable row level security;
alter table posts_to_publish enable row level security;
alter table publishing_channels enable row level security;
alter table publishing_queue enable row level security;
alter table saved_image_sets enable row level security;
alter table seo_snapshots enable row level security;

-- Create Policies (User Isolation)
-- ⚠️ YOU MUST RUN THIS FOR EACH TABLE REPEATEDLY OR USE A LOOP (SQL Script limitation)
-- Below is the template policy for 'projects'. Repeat or apply broadly.

create policy "Users can only access their own projects" on projects for all using (auth.uid() = user_id);
create policy "Users can only access their own keywords" on keyword_library for all using (auth.uid() = user_id);
create policy "Users can only access their own articles" on articles for all using (auth.uid() = user_id);
create policy "Users can only access their own models" on models for all using (auth.uid() = user_id);
create policy "Users can only access their own posts" on posts_to_publish for all using (auth.uid() = user_id);
create policy "Users can only access their own channels" on publishing_channels for all using (auth.uid() = user_id);
create policy "Users can only access their own queue" on publishing_queue for all using (auth.uid() = user_id);
create policy "Users can only access their own images" on saved_image_sets for all using (auth.uid() = user_id);
create policy "Users can only access their own snapshots" on seo_snapshots for all using (auth.uid() = user_id);
