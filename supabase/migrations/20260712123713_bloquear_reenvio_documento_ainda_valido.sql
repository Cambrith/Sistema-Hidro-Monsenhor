create or replace function public.portal_enviar_documento(
  p_aluno_id uuid,
  p_tipo text,
  p_nomes_arquivo text[],
  p_urls text[],
  p_forcar boolean default false
)
returns table(id uuid, tipo text, status text, nome_arquivo text[], url text[], observacao text, criado_em timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_aluno_id uuid;
  v_pendentes_mesmo_tipo int;
  v_envios_24h int;
  v_validade date;
begin
  select alunos.id into v_aluno_id from alunos where auth_user_id = auth.uid();
  if v_aluno_id is null or v_aluno_id != p_aluno_id then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  -- Se o documento ainda está bem dentro da validade (mais de 30 dias),
  -- não deixa reenviar sem querer — a não ser que a família confirme que
  -- precisa mesmo assim (p_forcar), por exemplo por mudança de condição médica.
  if not p_forcar then
    if p_tipo = 'atestado' then
      select atestado_validade into v_validade from alunos where id = p_aluno_id;
    else
      select parq_validade into v_validade from alunos where id = p_aluno_id;
    end if;

    if v_validade is not null and v_validade > (current_date + 30) then
      raise exception 'Documento ainda válido. Reenvio não é necessário.';
    end if;
  end if;

  select count(*) into v_pendentes_mesmo_tipo
  from documentos_aluno da
  where da.aluno_id = p_aluno_id and da.tipo = p_tipo and da.status = 'pendente';

  if v_pendentes_mesmo_tipo > 0 then
    raise exception 'Já existe um envio pendente desse tipo. Cancele-o antes de enviar outro.';
  end if;

  select count(*) into v_envios_24h
  from documentos_aluno da
  where da.aluno_id = p_aluno_id and da.criado_em > now() - interval '24 hours';

  if v_envios_24h >= 5 then
    raise exception 'Limite de envios diários atingido. Tente novamente amanhã.';
  end if;

  return query
  insert into documentos_aluno as da (aluno_id, tipo, nome_arquivo, url, status)
  values (p_aluno_id, p_tipo, p_nomes_arquivo, p_urls, 'pendente')
  returning da.id, da.tipo, da.status, da.nome_arquivo, da.url, da.observacao, da.criado_em;
end;
$function$;
