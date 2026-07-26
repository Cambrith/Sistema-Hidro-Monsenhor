
-- Fase 11.2 — RPCs de diagnóstico do sistema, restritas a Administrador.
-- Seguem o mesmo padrão de admin_listar_documentos/admin_registrar_documento:
-- checagem via admin_perfil_atual() (SECURITY DEFINER, baseado em auth.uid()).

create or replace function public.diagnostico_seguranca_rls()
returns table (
  tabela text,
  rls_habilitado boolean,
  total_policies int,
  policies jsonb,
  alertas jsonb
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_perfil text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return query
  with pol as (
    select
      p.tablename,
      jsonb_agg(
        jsonb_build_object('policyname', p.policyname, 'cmd', p.cmd, 'qual', p.qual)
        order by p.cmd, p.policyname
      ) as policies,
      count(*)::int as total,
      array_agg(distinct p.cmd) as comandos,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'policyname', p.policyname,
            'severidade', 'critico',
            'motivo', 'Política de SELECT libera leitura pública irrestrita (qual = true), sem exigir autenticação nenhuma.'
          )
        ) filter (where p.cmd = 'SELECT' and p.qual = 'true'),
        '[]'::jsonb
      )
      ||
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'policyname', p.policyname,
            'severidade', 'atencao',
            'motivo', 'Política de SELECT não referencia auth.uid(), meu_perfil() ou eh_admin() — confirme se o acesso público é intencional.'
          )
        ) filter (
          where p.cmd = 'SELECT' and p.qual <> 'true'
            and p.qual not ilike '%auth.uid()%'
            and p.qual not ilike '%meu_perfil()%'
            and p.qual not ilike '%eh_admin()%'
        ),
        '[]'::jsonb
      ) as alertas_policy
    from pg_policies p
    where p.schemaname = 'public'
    group by p.tablename
  )
  select
    t.tablename,
    t.rowsecurity,
    coalesce(pol.total, 0),
    coalesce(pol.policies, '[]'::jsonb),
    coalesce(pol.alertas_policy, '[]'::jsonb)
      || case when t.rowsecurity and not ('SELECT' = any(coalesce(pol.comandos, array[]::text[])))
              then jsonb_build_array(jsonb_build_object('policyname', null, 'severidade', 'atencao', 'motivo', 'RLS habilitado mas sem nenhuma política de SELECT — nenhuma linha é retornada por consulta direta.'))
              else '[]'::jsonb end
      || case when t.rowsecurity and not ('INSERT' = any(coalesce(pol.comandos, array[]::text[])))
              then jsonb_build_array(jsonb_build_object('policyname', null, 'severidade', 'atencao', 'motivo', 'RLS habilitado mas sem nenhuma política de INSERT — inserções diretas são sempre negadas (esperado se a escrita só ocorre via RPC).'))
              else '[]'::jsonb end
      || case when t.rowsecurity and not ('UPDATE' = any(coalesce(pol.comandos, array[]::text[])))
              then jsonb_build_array(jsonb_build_object('policyname', null, 'severidade', 'atencao', 'motivo', 'RLS habilitado mas sem nenhuma política de UPDATE — atualizações diretas são sempre negadas (esperado se a escrita só ocorre via RPC).'))
              else '[]'::jsonb end
      || case when t.rowsecurity and not ('DELETE' = any(coalesce(pol.comandos, array[]::text[])))
              then jsonb_build_array(jsonb_build_object('policyname', null, 'severidade', 'atencao', 'motivo', 'RLS habilitado mas sem nenhuma política de DELETE — exclusões diretas são sempre negadas (esperado se a exclusão só ocorre via RPC).'))
              else '[]'::jsonb end
    as alertas
  from pg_tables t
  left join pol on pol.tablename = t.tablename
  where t.schemaname = 'public'
  order by t.tablename;
end;
$function$;

create or replace function public.diagnostico_integridade_dados()
returns table (
  chave text,
  severidade text,
  contagem bigint,
  descricao text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_perfil text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return query
  select 'alunos_sem_acesso_portal'::text, 'critico'::text,
    (select count(*) from alunos where ativo = true and (nome_mae is null or btrim(nome_mae) = '') and (endereco is null or btrim(endereco) = '')),
    'Sem nome da mãe e sem endereço cadastrados — não conseguem completar o login no portal do aluno.'::text
  union all
  select 'alunos_sem_vinculo_turma', 'critico',
    (select count(*) from alunos a where a.ativo = true and not exists (select 1 from alunos_turmas at where at.aluno_id = a.id)),
    'Alunos ativos sem nenhuma turma vinculada em alunos_turmas.'
  union all
  select 'turmas_ativas_sem_professor', 'atencao',
    (select count(*) from turmas where ativa = true and (professor is null or btrim(professor) = '')),
    'Turmas ativas sem professor responsável definido.'
  union all
  select 'alunos_sem_nome_mae', 'atencao',
    (select count(*) from alunos where ativo = true and (nome_mae is null or btrim(nome_mae) = '')),
    'Alunos ativos sem nome da mãe cadastrado.'
  union all
  select 'alunos_sem_telefone', 'atencao',
    (select count(*) from alunos where ativo = true and (telefone is null or btrim(telefone) = '')),
    'Alunos ativos sem telefone de contato cadastrado.'
  union all
  select 'alunos_idade_dessincronizada', 'atencao',
    (select count(*) from alunos where ativo = true and idade is not null and nascimento is not null and idade <> date_part('year', age(nascimento))),
    'Campo idade não bate com a idade calculada a partir da data de nascimento.'
  union all
  select 'alunos_duplicados', 'atencao',
    (select count(*) from (select 1 from alunos where ativo = true group by lower(btrim(nome_completo)), nascimento having count(*) > 1) grupos),
    'Grupos de alunos ativos com mesmo nome e data de nascimento — possível cadastro duplicado.'
  union all
  select 'alunos_sem_cpf', 'informativo',
    (select count(*) from alunos where ativo = true and (cpf is null or btrim(cpf) = '')),
    'Alunos ativos sem CPF cadastrado.';
end;
$function$;

create or replace function public.diagnostico_listar_problema(p_tipo text)
returns table (
  id uuid,
  nome text,
  detalhe text,
  total bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_perfil text;
  v_total bigint;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  if p_tipo = 'alunos_sem_acesso_portal' then
    select count(*) into v_total from alunos where ativo = true and (nome_mae is null or btrim(nome_mae) = '') and (endereco is null or btrim(endereco) = '');
    return query
    select a.id, a.nome_completo, 'Sem nome da mãe e sem endereço'::text, v_total
    from alunos a
    where a.ativo = true and (a.nome_mae is null or btrim(a.nome_mae) = '') and (a.endereco is null or btrim(a.endereco) = '')
    order by a.nome_completo
    limit 500;

  elsif p_tipo = 'alunos_sem_vinculo_turma' then
    select count(*) into v_total from alunos a where a.ativo = true and not exists (select 1 from alunos_turmas at where at.aluno_id = a.id);
    return query
    select a.id, a.nome_completo, coalesce(a.turma, 'Sem turma'), v_total
    from alunos a
    where a.ativo = true and not exists (select 1 from alunos_turmas at where at.aluno_id = a.id)
    order by a.nome_completo
    limit 500;

  elsif p_tipo = 'turmas_ativas_sem_professor' then
    select count(*) into v_total from turmas where ativa = true and (professor is null or btrim(professor) = '');
    return query
    select t.id, t.nome, coalesce(t.dia_semana, '—'), v_total
    from turmas t
    where t.ativa = true and (t.professor is null or btrim(t.professor) = '')
    order by t.nome
    limit 500;

  elsif p_tipo = 'alunos_sem_nome_mae' then
    select count(*) into v_total from alunos where ativo = true and (nome_mae is null or btrim(nome_mae) = '');
    return query
    select a.id, a.nome_completo, coalesce(a.turma, '—'), v_total
    from alunos a
    where a.ativo = true and (a.nome_mae is null or btrim(a.nome_mae) = '')
    order by a.nome_completo
    limit 500;

  elsif p_tipo = 'alunos_sem_telefone' then
    select count(*) into v_total from alunos where ativo = true and (telefone is null or btrim(telefone) = '');
    return query
    select a.id, a.nome_completo, coalesce(a.turma, '—'), v_total
    from alunos a
    where a.ativo = true and (a.telefone is null or btrim(a.telefone) = '')
    order by a.nome_completo
    limit 500;

  elsif p_tipo = 'alunos_idade_dessincronizada' then
    select count(*) into v_total from alunos where ativo = true and idade is not null and nascimento is not null and idade <> date_part('year', age(nascimento));
    return query
    select a.id, a.nome_completo,
      format('Cadastrado: %s anos · Calculado: %s anos', a.idade, date_part('year', age(a.nascimento))::int),
      v_total
    from alunos a
    where a.ativo = true and a.idade is not null and a.nascimento is not null and a.idade <> date_part('year', age(a.nascimento))
    order by a.nome_completo
    limit 500;

  elsif p_tipo = 'alunos_duplicados' then
    select count(*) into v_total from alunos a where a.ativo = true and exists (
      select 1 from alunos b where b.ativo = true and b.id <> a.id
        and lower(btrim(b.nome_completo)) = lower(btrim(a.nome_completo)) and b.nascimento = a.nascimento
    );
    return query
    select a.id, a.nome_completo, format('Nascimento: %s', to_char(a.nascimento, 'DD/MM/YYYY')), v_total
    from alunos a
    where a.ativo = true and exists (
      select 1 from alunos b where b.ativo = true and b.id <> a.id
        and lower(btrim(b.nome_completo)) = lower(btrim(a.nome_completo)) and b.nascimento = a.nascimento
    )
    order by lower(btrim(a.nome_completo)), a.nascimento
    limit 500;

  elsif p_tipo = 'alunos_sem_cpf' then
    select count(*) into v_total from alunos where ativo = true and (cpf is null or btrim(cpf) = '');
    return query
    select a.id, a.nome_completo, coalesce(a.turma, '—'), v_total
    from alunos a
    where a.ativo = true and (a.cpf is null or btrim(a.cpf) = '')
    order by a.nome_completo
    limit 500;

  else
    raise exception 'Tipo de problema desconhecido: %', p_tipo;
  end if;
end;
$function$;

create or replace function public.diagnostico_saude_operacional()
returns table (
  ultima_chamada_em timestamptz,
  ultima_presenca_em timestamptz,
  ultimo_aluno_cadastrado_em timestamptz,
  documentos_pendentes bigint,
  documento_pendente_mais_antigo_dias int,
  chaves_bloqueadas bigint,
  tamanho_banco_bytes bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_perfil text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return query
  select
    (select max(criado_em) from chamadas),
    (select max(criado_em) from presencas),
    (select max(criado_em) from alunos),
    (select count(*) from documentos_aluno where status = 'pendente'),
    (select coalesce(extract(day from now() - min(criado_em))::int, 0) from documentos_aluno where status = 'pendente'),
    (select count(*) from tentativas_login_aluno where bloqueado_ate is not null and bloqueado_ate > now()),
    pg_database_size(current_database());
end;
$function$;

create or replace function public.diagnostico_equipe()
returns table (nome text, perfil text, ativo boolean, criado_em timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_perfil text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return query
  select p.nome, p.perfil, p.ativo, p.criado_em from perfis p order by p.criado_em;
end;
$function$;

create table public.backups_log (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  tabelas text[] not null default '{}',
  gerado_por text,
  criado_em timestamptz not null default now()
);

alter table public.backups_log enable row level security;

create policy "backups_log leitura admin" on public.backups_log
  for select using (eh_admin());

create policy "backups_log insercao admin" on public.backups_log
  for insert with check (eh_admin());

create or replace function public.diagnostico_registrar_backup(p_tipo text, p_tabelas text[], p_gerado_por text default null)
returns table (id uuid, tipo text, tabelas text[], gerado_por text, criado_em timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_perfil text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return query
  insert into backups_log as bl (tipo, tabelas, gerado_por)
  values (p_tipo, p_tabelas, coalesce(p_gerado_por, v_perfil))
  returning bl.id, bl.tipo, bl.tabelas, bl.gerado_por, bl.criado_em;
end;
$function$;

create or replace function public.diagnostico_ultimo_backup()
returns table (id uuid, tipo text, tabelas text[], gerado_por text, criado_em timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_perfil text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  return query
  select bl.id, bl.tipo, bl.tabelas, bl.gerado_por, bl.criado_em
  from backups_log bl
  order by bl.criado_em desc
  limit 1;
end;
$function$;
