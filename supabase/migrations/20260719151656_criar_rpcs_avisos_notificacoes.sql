-- Contagem de avisos não lidos no portal (badge do sino).
create or replace function public.portal_avisos_nao_lidos(p_aluno_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_aluno_id uuid;
  v_visto_em timestamptz;
  v_total integer;
begin
  select alunos.id into v_aluno_id from alunos where auth_user_id = auth.uid();
  if v_aluno_id is null or v_aluno_id != p_aluno_id then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select visto_em into v_visto_em from avisos_visitas_portal where aluno_id = p_aluno_id;

  select count(*) into v_total
  from avisos a
  where a.ativo = true
    and a.visivel_portal = true
    and (a.turma_id is null or a.turma_id in (
      select turma_id from alunos_turmas where aluno_id = p_aluno_id and ativo = true
    ))
    and a.created_at > coalesce(v_visto_em, '-infinity'::timestamptz);

  return v_total;
end;
$$;

-- Marca avisos como vistos (chamado ao abrir /portal/avisos).
create or replace function public.portal_avisos_marcar_visto(p_aluno_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_aluno_id uuid;
begin
  select alunos.id into v_aluno_id from alunos where auth_user_id = auth.uid();
  if v_aluno_id is null or v_aluno_id != p_aluno_id then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  insert into avisos_visitas_portal (aluno_id, visto_em)
  values (p_aluno_id, now())
  on conflict (aluno_id) do update set visto_em = excluded.visto_em;
end;
$$;

-- Lista avisos visíveis pro aluno no portal, já filtrando por turma-alvo (NULL = todas).
create or replace function public.portal_avisos_listar(p_aluno_id uuid)
returns setof avisos
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_aluno_id uuid;
begin
  select alunos.id into v_aluno_id from alunos where auth_user_id = auth.uid();
  if v_aluno_id is null or v_aluno_id != p_aluno_id then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  return query
  select a.*
  from avisos a
  where a.ativo = true
    and a.visivel_portal = true
    and (a.turma_id is null or a.turma_id in (
      select turma_id from alunos_turmas where aluno_id = p_aluno_id and ativo = true
    ))
  order by a.data desc, a.created_at desc
  limit 30;
end;
$$;

-- Registra/atualiza a inscrição de push do aluno neste dispositivo.
create or replace function public.portal_push_subscribir(
  p_aluno_id uuid, p_endpoint text, p_p256dh text, p_auth text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_aluno_id uuid;
begin
  select alunos.id into v_aluno_id from alunos where auth_user_id = auth.uid();
  if v_aluno_id is null or v_aluno_id != p_aluno_id then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  insert into push_subscriptions (aluno_id, endpoint, p256dh, auth_key)
  values (p_aluno_id, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set aluno_id = excluded.aluno_id, p256dh = excluded.p256dh, auth_key = excluded.auth_key;
end;
$$;

-- Cancela a inscrição de push do aluno neste dispositivo.
create or replace function public.portal_push_cancelar(p_aluno_id uuid, p_endpoint text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_aluno_id uuid;
begin
  select alunos.id into v_aluno_id from alunos where auth_user_id = auth.uid();
  if v_aluno_id is null or v_aluno_id != p_aluno_id then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  delete from push_subscriptions where endpoint = p_endpoint and aluno_id = p_aluno_id;
end;
$$;
