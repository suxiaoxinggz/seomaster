-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 0. Profiles (SaaS User Data)
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  "subscription_tier" text default 'free',
  "credits_balance" int default 10,
  "stripe_customer_id" text,
  "subscription_status" text default 'inactive',
  "updated_at" timestamp with time zone,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 0.1 Usage Logs (Credit History)
create table if not exists usage_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  action text not null,
  cost int default 0,
  details jsonb,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for new tables
alter table profiles enable row level security;
alter table usage_logs enable row level security;

-- Policies (Idempotent)
do $$ begin
  if not exists (select from pg_policies where policyname = 'Users can view own profile') then
    create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can update own profile') then
    create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can view own logs') then
    create policy "Users can view own logs" on usage_logs for select using (auth.uid() = user_id);
  end if;
end $$;

-- 1. Projects
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Keyword Library (Sub Projects)
create table if not exists keyword_library (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  "parent_project_id" uuid references projects(id) on delete cascade not null,
  "saved_at" timestamp with time zone default timezone('utc'::text, now()) not null,
  "model_used" text not null,
  keywords jsonb default '[]'::jsonb, 
  translations jsonb default '{}'::jsonb,
  "published_destinations" jsonb default '[]'::jsonb
);

-- 3. Articles
create table if not exists articles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  content text default '',
  "keyword_context" text,
  "parent_project_id" uuid, 
  "sub_project_id" uuid, 
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
  "model_used" text,
  "published_destinations" jsonb default '[]'::jsonb
);

-- 4. Models (Custom User Models)
create table if not exists models (
  id text primary key, 
  user_id uuid references auth.users not null,
  nickname text not null,
  "api_key" text not null,
  "base_url" text,
  version text,
  "supports_web_search" boolean default false,
  type text not null,
  "api_provider" text not null,
  "is_default" boolean default false
);

-- 5. Posts to Publish (Formatted Posts)
create table if not exists posts_to_publish (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  "html_content" text,
  "markdown_content" text,
  "keyword_context" text,
  "used_images" jsonb default '[]'::jsonb,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
  "parent_project_id" uuid,
  "sub_project_id" uuid,
  "published_destinations" jsonb default '[]'::jsonb
);

-- 6. Publishing Channels
create table if not exists publishing_channels (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  platform text not null,
  config jsonb default '{}'::jsonb,
  "is_default" boolean default false
);

-- 7. Publishing Queue
create table if not exists publishing_queue (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  "source_id" uuid not null,
  "source_type" text not null,
  name text not null,
  status text not null,
  log text,
  data jsonb 
);

-- 8. Saved Image Sets
create table if not exists saved_image_sets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  "search_term_or_prompt" text,
  images jsonb default '[]'::jsonb,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
  "parent_project_id" uuid,
  "sub_project_id" uuid,
  "published_destinations" jsonb default '[]'::jsonb
);

-- 9. SEO Snapshots
create table if not exists seo_snapshots (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  type text not null,
  query text not null,
  parameters jsonb default '{}'::jsonb,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  tags text[] default array[]::text[]
);

-- Enable RLS logic
alter table projects enable row level security;
alter table keyword_library enable row level security;
alter table articles enable row level security;
alter table models enable row level security;
alter table posts_to_publish enable row level security;
alter table publishing_channels enable row level security;
alter table publishing_queue enable row level security;
alter table saved_image_sets enable row level security;
alter table seo_snapshots enable row level security;

-- Policies (Wrapped in DO block for Safety)
do $$ begin
  if not exists (select from pg_policies where policyname = 'Users can only access their own projects') then
    create policy "Users can only access their own projects" on projects for all using (auth.uid() = user_id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can only access their own keywords') then
    create policy "Users can only access their own keywords" on keyword_library for all using (auth.uid() = user_id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can only access their own articles') then
    create policy "Users can only access their own articles" on articles for all using (auth.uid() = user_id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can only access their own models') then
    create policy "Users can only access their own models" on models for all using (auth.uid() = user_id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can only access their own posts') then
    create policy "Users can only access their own posts" on posts_to_publish for all using (auth.uid() = user_id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can only access their own channels') then
    create policy "Users can only access their own channels" on publishing_channels for all using (auth.uid() = user_id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can only access their own queue') then
    create policy "Users can only access their own queue" on publishing_queue for all using (auth.uid() = user_id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can only access their own images') then
    create policy "Users can only access their own images" on saved_image_sets for all using (auth.uid() = user_id);
  end if;
  if not exists (select from pg_policies where policyname = 'Users can only access their own snapshots') then
    create policy "Users can only access their own snapshots" on seo_snapshots for all using (auth.uid() = user_id);
  end if;
end $$;
