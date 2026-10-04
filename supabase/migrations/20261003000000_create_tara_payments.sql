create table if not exists public.tara_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null unique,
  template_id text not null check (template_id in ('sillage', 'atlas', 'signal')),
  amount integer not null check (amount = 100),
  status text not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILURE')),
  payment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.tara_payments enable row level security;
