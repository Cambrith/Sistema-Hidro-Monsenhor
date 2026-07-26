CREATE OR REPLACE FUNCTION public.admin_registrar_documento(
  p_aluno_id uuid,
  p_tipo text,
  p_nomes_arquivo text[],
  p_urls text[],
  p_validade date,
  p_observacao text DEFAULT NULL
)
RETURNS TABLE(id uuid, tipo text, status text, nome_arquivo text[], url text[], observacao text, criado_em timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_perfil text;
  v_campo text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil not in ('Administrador', 'Recepção') then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  if p_tipo not in ('atestado', 'par_q') then
    raise exception 'Tipo de documento inválido: %', p_tipo;
  end if;

  if p_validade is null then
    raise exception 'Validade é obrigatória.';
  end if;

  if p_nomes_arquivo is null or array_length(p_nomes_arquivo, 1) is null then
    raise exception 'É necessário anexar ao menos um arquivo.';
  end if;

  if not exists (select 1 from alunos where alunos.id = p_aluno_id) then
    raise exception 'Aluno não encontrado.';
  end if;

  v_campo := case p_tipo
    when 'par_q' then 'parq_validade'
    when 'atestado' then 'atestado_validade'
  end;

  execute format('update alunos set %I = $1 where id = $2', v_campo)
    using p_validade, p_aluno_id;

  return query
  insert into documentos_aluno as da (aluno_id, tipo, nome_arquivo, url, status, observacao)
  values (
    p_aluno_id,
    p_tipo,
    p_nomes_arquivo,
    p_urls,
    'aprovado',
    coalesce(nullif(trim(p_observacao), ''), 'Registrado manualmente pela secretaria (documento físico).')
  )
  returning da.id, da.tipo, da.status, da.nome_arquivo, da.url, da.observacao, da.criado_em;
end;
$function$;
