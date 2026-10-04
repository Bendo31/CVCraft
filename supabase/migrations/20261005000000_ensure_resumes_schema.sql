create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  role text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  linkedin text not null default '',
  summary text not null default '',
  photo_url text,
  content jsonb not null default '{}'::jsonb,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resumes
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists role text not null default '',
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists city text not null default '',
  add column if not exists linkedin text not null default '',
  add column if not exists summary text not null default '',
  add column if not exists photo_url text,
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists pdf_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists resumes_user_id_key on public.resumes(user_id);

alter table public.resumes enable row level security;

grant select, insert, update, delete on public.resumes to authenticated;

drop policy if exists "Users can view own resume" on public.resumes;
create policy "Users can view own resume"
  on public.resumes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own resume" on public.resumes;
create policy "Users can insert own resume"
  on public.resumes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own resume" on public.resumes;
create policy "Users can update own resume"
  on public.resumes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own resume" on public.resumes;
create policy "Users can delete own resume"
  on public.resumes for delete to authenticated
  using ((select auth.uid()) = user_id);
