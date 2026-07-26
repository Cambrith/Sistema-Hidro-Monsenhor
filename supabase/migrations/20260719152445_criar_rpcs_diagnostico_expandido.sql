-- Contagem real de registros por tabela principal (Aba "Banco de dados").
create or replace function public.diagnostico_contagem_tabelas()
returns table(tabela text, total bigint)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_perfil text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return query
    select 'alunos'::text, count(*) from alunos
    union all select 'turmas', count(*) from turmas
    union all select 'alunos_turmas', count(*) from alunos_turmas
    union all select 'lista_espera', count(*) from lista_espera
    union all select 'avisos', count(*) from avisos
    union all select 'chamadas', count(*) from chamadas
    union all select 'presencas', count(*) from presencas
    union all select 'documentos_aluno', count(*) from documentos_aluno
    union all select 'ocorrencias_alunos', count(*) from ocorrencias_alunos
    union all select 'push_subscriptions', count(*) from push_subscriptions;
end;
$$;

-- Uso do bucket de Storage usado para atestado/PAR-Q (documentos-aluno).
create or replace function public.diagnostico_storage_uso()
returns table(bucket text, total_arquivos bigint, tamanho_bytes numeric)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_perfil text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return query
  select
    'documentos-aluno'::text,
    count(*),
    coalesce(sum((o.metadata->>'size')::numeric), 0)
  from storage.objects o
  where o.bucket_id = 'documentos-aluno';
end;
$$;

-- Lista as funções SECURITY DEFINER do schema public (RPCs "ativas" hoje).
-- Última chamada / taxa de erro não são incluídas: não existe logging de uso
-- de função nesse projeto — mostrar isso aqui seria inventar dado.
create or replace function public.diagnostico_rpcs_ativas()
returns table(nome text, security_definer boolean)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_perfil text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return query
  select p.proname::text, p.prosecdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
  order by p.proname;
end;
$$;

-- Tentativas de login recentes do portal do aluno (tabela já existente).
create or replace function public.diagnostico_tentativas_login_recentes()
returns table(chave text, falhas integer, bloqueado_ate timestamptz, atualizado_em timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_perfil text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return query
  select t.chave, t.falhas, t.bloqueado_ate, t.atualizado_em
  from tentativas_login_aluno t
  order by t.atualizado_em desc
  limit 50;
end;
$$;
