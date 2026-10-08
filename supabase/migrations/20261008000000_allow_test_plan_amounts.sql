-- Autoriser les montants de test (100 FCFA) pour les paiements d'offres Pro et Gold
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'cvcraft_plan_payments'
  ) then
    alter table public.cvcraft_plan_payments
      drop constraint if exists cvcraft_plan_payments_amount_check;

    alter table public.cvcraft_plan_payments
      add constraint cvcraft_plan_payments_amount_check check (
        (plan_id = 'pro' and amount in (100, 1500))
        or (plan_id = 'gold' and amount in (100, 2500))
      );
  end if;
end $$;

-- Mise à jour du trigger pour permettre la modification des CV même si l'offre a expiré
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

notify pgrst, 'reload schema';
