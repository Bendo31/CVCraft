-- Migration pour autoriser la consultation publique d'un CV via un lien de partage
grant select on public.resumes to anon;

-- Politique permettant la lecture d'un CV (partage public en lecture seule)
drop policy if exists "Allow select resume for sharing" on public.resumes;
create policy "Allow select resume for sharing"
  on public.resumes for select to anon, authenticated
  using (true);

-- Fonction RPC avec security definer pour un accès direct et sécurisé par ID
create or replace function public.get_shared_resume(p_resume_id uuid)
returns setof public.resumes
language sql
security definer
set search_path = public
as $$
  select * from public.resumes where id = p_resume_id;
$$;

grant execute on function public.get_shared_resume(uuid) to anon, authenticated;

-- Rafraîchir le cache PostgREST
notify pgrst, 'reload schema';
