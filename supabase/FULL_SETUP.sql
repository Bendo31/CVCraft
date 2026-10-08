-- ==============================================================================
-- CV CRAFT - SCRIPT DE DÉPLOIEMENT COMPLET BASE DE DONNÉES SUPABASE
-- À exécuter dans le SQL Editor de Supabase (exécute tout sans prérequis)
-- ==============================================================================

-- 1. Table des CVs (public.resumes)
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

-- Colonnes éventuelles si la table existait déjà partiellement
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

-- Supprimer l'ancienne contrainte 1 seul CV par utilisateur pour autoriser le multi-CV
drop index if exists public.resumes_user_id_key;

-- Politiques RLS pour les CVs
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


-- 2. Table des paiements de templates individuels (public.tara_payments)
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

alter table public.tara_payments
  add column if not exists resume_id uuid references public.resumes(id) on delete set null;

alter table public.tara_payments enable row level security;


-- 3. Table des abonnements (public.cvcraft_subscriptions)
create table if not exists public.cvcraft_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('pro', 'gold')),
  valid_until timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.cvcraft_subscriptions enable row level security;
grant select on public.cvcraft_subscriptions to authenticated;

drop policy if exists "Users can view own CV Craft subscription" on public.cvcraft_subscriptions;
create policy "Users can view own CV Craft subscription"
  on public.cvcraft_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);


-- 4. Table des paiements d'offres / abonnements (public.cvcraft_plan_payments)
create table if not exists public.cvcraft_plan_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null unique,
  plan_id text not null check (plan_id in ('pro', 'gold')),
  amount integer not null check (
    (plan_id = 'pro' and amount in (100, 1500))
    or (plan_id = 'gold' and amount in (100, 2500))
  ),
  status text not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILURE')),
  payment_url text,
  entitlement_applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Si la contrainte existait déjà avec seulement 1500/2500, la mettre à jour pour 100 FCFA
alter table public.cvcraft_plan_payments
  drop constraint if exists cvcraft_plan_payments_amount_check;

alter table public.cvcraft_plan_payments
  add constraint cvcraft_plan_payments_amount_check check (
    (plan_id = 'pro' and amount in (100, 1500))
    or (plan_id = 'gold' and amount in (100, 2500))
  );

alter table public.cvcraft_plan_payments enable row level security;


-- 5. Trigger de contrôle des quotas de CVs
create or replace function public.enforce_cvcraft_resume_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_plan text := 'free';
  plan_valid_until timestamptz;
  resume_limit integer := 1;
  existing_count integer;
  newer_count integer;
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then
    raise exception 'Vous ne pouvez gérer que vos propres CV.';
  end if;

  perform pg_advisory_xact_lock(hashtext(new.user_id::text));

  select plan_id, valid_until
    into current_plan, plan_valid_until
    from public.cvcraft_subscriptions
    where user_id = new.user_id;

  current_plan := coalesce(current_plan, 'free');
  if current_plan in ('pro', 'gold') and plan_valid_until <= now() then
    current_plan := 'free';
  end if;

  if current_plan = 'gold' then
    resume_limit := 3;
  end if;

  if tg_op = 'INSERT' then
    select count(*)
      into existing_count
      from public.resumes
      where user_id = new.user_id;
    if existing_count >= resume_limit then
      raise exception 'La limite de CV de votre offre est atteinte.';
    end if;
  else
    select count(*)
      into newer_count
      from public.resumes
      where user_id = new.user_id
        and (updated_at > old.updated_at or (updated_at = old.updated_at and id > old.id));
    if newer_count >= resume_limit then
      raise exception 'Ce CV dépasse le quota actif de votre offre.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_cvcraft_resume_entitlement on public.resumes;
create trigger enforce_cvcraft_resume_entitlement
  before insert or update on public.resumes
  for each row execute function public.enforce_cvcraft_resume_entitlement();


-- 6. Fonction RPC d'activation d'abonnement après paiement confirmé
create or replace function public.activate_cvcraft_plan_payment(p_payment_id uuid)
returns table (plan_id text, valid_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment public.cvcraft_plan_payments%rowtype;
  current_subscription public.cvcraft_subscriptions%rowtype;
  activation_start timestamptz;
  duration_months integer;
begin
  select * into payment
    from public.cvcraft_plan_payments
    where id = p_payment_id
    for update;

  if not found or payment.status <> 'SUCCESS' then
    raise exception 'Le paiement de l’offre n’est pas confirmé.';
  end if;

  select * into current_subscription
    from public.cvcraft_subscriptions
    where user_id = payment.user_id
    for update;

  if payment.entitlement_applied_at is not null then
    return query
      select current_subscription.plan_id, current_subscription.valid_until;
    return;
  end if;

  duration_months := case payment.plan_id when 'pro' then 3 when 'gold' then 1 end;
  if duration_months is null then
    raise exception 'L’offre associée au paiement est invalide.';
  end if;

  activation_start := now();
  if current_subscription.plan_id = payment.plan_id
      and current_subscription.valid_until > activation_start then
    activation_start := current_subscription.valid_until;
  end if;

  plan_id := payment.plan_id;
  valid_until := activation_start + make_interval(months => duration_months);
  insert into public.cvcraft_subscriptions (user_id, plan_id, valid_until, updated_at)
    values (payment.user_id, plan_id, valid_until, now())
    on conflict (user_id) do update
      set plan_id = excluded.plan_id,
          valid_until = excluded.valid_until,
          updated_at = excluded.updated_at;

  update public.cvcraft_plan_payments
    set entitlement_applied_at = now(),
        updated_at = now()
    where id = payment.id;

  return next;
end;
$$;

revoke all on function public.activate_cvcraft_plan_payment(uuid) from public, anon, authenticated;
grant execute on function public.activate_cvcraft_plan_payment(uuid) to service_role;

-- 7. Recharger le cache PostgREST Supabase
notify pgrst, 'reload schema';
