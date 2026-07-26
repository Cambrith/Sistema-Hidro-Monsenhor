
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
      p.tablename::text as tablename,
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
    t.tablename::text,
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
  left join pol on pol.tablename::text = t.tablename::text
  where t.schemaname = 'public'
  order by t.tablename;
end;
$function$;
