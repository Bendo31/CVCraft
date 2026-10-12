-- ==============================================================================
-- CV CRAFT - FONCTION STATISTIQUES ET COMPTE-RENDU DASHBOARD ADMINISTRATEUR
-- ==============================================================================

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total_users integer := 0;
  v_free_users integer := 0;
  v_pro_users integer := 0;
  v_gold_users integer := 0;
  v_total_revenue bigint := 0;
  v_revenue_pro bigint := 0;
  v_revenue_gold bigint := 0;
  v_revenue_templates bigint := 0;
  v_total_resumes integer := 0;
  v_total_pdfs integer := 0;
  v_recent_payments jsonb := '[]'::jsonb;
  v_recent_users jsonb := '[]'::jsonb;
  v_templates_usage jsonb := '[]'::jsonb;
begin
  -- 1. Nombre total d'utilisateurs distincts
  begin
    select count(distinct id) into v_total_users from auth.users;
  exception when others then
    select count(distinct user_id) into v_total_users from public.resumes;
  end;

  if v_total_users = 0 then
    select count(distinct user_id) into v_total_users from public.resumes;
  end if;

  -- 2. Répartition des abonnements actifs
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'cvcraft_subscriptions'
  ) then
    select
      count(case when plan_id = 'pro' and valid_until > now() then 1 end),
      count(case when plan_id = 'gold' and valid_until > now() then 1 end)
    into v_pro_users, v_gold_users
    from public.cvcraft_subscriptions;
  end if;

  v_free_users := greatest(0, v_total_users - (v_pro_users + v_gold_users));

  -- 3. Encaissements abonnements (cvcraft_plan_payments)
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'cvcraft_plan_payments'
  ) then
    select
      coalesce(sum(case when status = 'SUCCESS' then amount else 0 end), 0),
      coalesce(sum(case when status = 'SUCCESS' and plan_id = 'pro' then amount else 0 end), 0),
      coalesce(sum(case when status = 'SUCCESS' and plan_id = 'gold' then amount else 0 end), 0)
    into v_total_revenue, v_revenue_pro, v_revenue_gold
    from public.cvcraft_plan_payments;
  end if;

  -- 4. Encaissements templates individuels (tara_payments)
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'tara_payments'
  ) then
    select coalesce(sum(case when status = 'SUCCESS' then amount else 0 end), 0)
    into v_revenue_templates
    from public.tara_payments;
  end if;

  v_total_revenue := v_total_revenue + v_revenue_templates;

  -- 5. Statistiques sur les CVs (public.resumes)
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'resumes'
  ) then
    select
      count(*),
      count(case when pdf_url is not null and pdf_url <> '' then 1 end)
    into v_total_resumes, v_total_pdfs
    from public.resumes;

    -- Popularité des templates
    select coalesce(jsonb_agg(t), '[]'::jsonb)
    into v_templates_usage
    from (
      select
        coalesce(content->>'template', 'gratuit') as template_id,
        count(*) as count
      from public.resumes
      group by 1
      order by count desc
      limit 10
    ) t;

    -- Utilisateurs récents
    select coalesce(jsonb_agg(u), '[]'::jsonb)
    into v_recent_users
    from (
      select
        r.user_id,
        coalesce(nullif(trim(r.first_name || ' ' || r.last_name), ''), r.email, 'Utilisateur') as name,
        r.email,
        r.phone,
        coalesce(s.plan_id, 'free') as plan_id,
        case when s.valid_until is not null and s.valid_until > now() then true else false end as is_active,
        r.created_at
      from public.resumes r
      left join public.cvcraft_subscriptions s on s.user_id = r.user_id
      order by r.created_at desc
      limit 25
    ) u;
  end if;

  -- 6. Paiements récents
  select coalesce(jsonb_agg(p), '[]'::jsonb)
  into v_recent_payments
  from (
    select
      id,
      user_id,
      item_type,
      amount,
      status,
      created_at,
      paid_at,
      product_id
    from (
      select 
        id, 
        user_id, 
        plan_id as item_type, 
        amount, 
        status, 
        created_at, 
        paid_at, 
        product_id 
      from public.cvcraft_plan_payments
      union all
      select 
        id, 
        user_id, 
        ('template:' || template_id) as item_type, 
        amount, 
        status, 
        created_at, 
        paid_at, 
        product_id 
      from public.tara_payments
    ) all_payments
    order by created_at desc
    limit 30
  ) p;

  return jsonb_build_object(
    'total_users', v_total_users,
    'free_users', v_free_users,
    'pro_users', v_pro_users,
    'gold_users', v_gold_users,
    'premium_users', v_pro_users + v_gold_users,
    'total_revenue', v_total_revenue,
    'revenue_pro', v_revenue_pro,
    'revenue_gold', v_revenue_gold,
    'revenue_templates', v_revenue_templates,
    'total_resumes', v_total_resumes,
    'total_pdfs', v_total_pdfs,
    'recent_payments', v_recent_payments,
    'recent_users', v_recent_users,
    'templates_usage', v_templates_usage
  );
end;
$$;

grant execute on function public.get_admin_dashboard_stats() to authenticated, anon;
notify pgrst, 'reload schema';
