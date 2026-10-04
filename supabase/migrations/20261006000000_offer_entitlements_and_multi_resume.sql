drop index if exists public.resumes_user_id_key;

alter table public.tara_payments
  add column if not exists resume_id uuid references public.resumes(id) on delete set null;

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
    if tg_op = 'UPDATE' then
      raise exception 'Votre offre a expiré. Réactivez-la pour modifier ou télécharger vos CV.';
    end if;
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

create table if not exists public.cvcraft_plan_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null unique,
  plan_id text not null check (plan_id in ('pro', 'gold')),
  amount integer not null check (
    (plan_id = 'pro' and amount = 1500)
    or (plan_id = 'gold' and amount = 2500)
  ),
  status text not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILURE')),
  payment_url text,
  entitlement_applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.cvcraft_plan_payments enable row level security;

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

notify pgrst, 'reload schema';
