-- Políticas antigas de storage.objects não checavam dono nenhum --
-- qualquer anon conseguia listar, baixar e apagar todos os documentos.
drop policy "portal_select_documentos_aluno" on storage.objects;
drop policy "leitura documentos equipe" on storage.objects;
drop policy "upload documentos aluno" on storage.objects;
drop policy "portal_delete_documentos_aluno" on storage.objects;

-- Aluno: só a própria pasta (nome da pasta = alunos.id do dono)
create policy "aluno le proprios documentos storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documentos-aluno'
    and (storage.foldername(name))[1] = (select id::text from alunos where auth_user_id = auth.uid())
  );

create policy "aluno envia proprios documentos storage"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documentos-aluno'
    and (storage.foldername(name))[1] = (select id::text from alunos where auth_user_id = auth.uid())
  );

-- Equipe (Administrador/Recepção): leitura de qualquer documento, pra revisão
create policy "equipe le documentos storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documentos-aluno'
    and meu_perfil() = any (array['Administrador','Recepção'])
  );

-- Equipe: upload em nome do aluno (registro manual de documento físico)
create policy "equipe envia documentos storage"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documentos-aluno'
    and meu_perfil() = any (array['Administrador','Recepção'])
  );

-- Sem política de DELETE nenhuma pra anon nem authenticated -- exclusão só
-- via service role, dentro de Edge Function, depois de checagem própria.

-- Limites que faltavam no bucket, alinhados com a validação já existente no cliente
update storage.buckets
set file_size_limit = 5242880, -- 5MB
    allowed_mime_types = array['image/png','image/jpeg','application/pdf']
where id = 'documentos-aluno';

-- admin_excluir_documento: agora zera a validade em alunos quando o
-- documento excluído estava aprovado -- sem isso, a data de validade
-- ficava no cadastro sem nenhum documento por trás.
create or replace function public.admin_excluir_documento(p_documento_id uuid)
returns table(url text[])
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_perfil text;
  v_aluno_id uuid;
  v_tipo text;
  v_status text;
  v_campo text;
begin
  v_perfil := admin_perfil_atual();
  if v_perfil is null or v_perfil <> 'Administrador' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select da.aluno_id, da.tipo, da.status into v_aluno_id, v_tipo, v_status
  from documentos_aluno da
  where da.id = p_documento_id;

  if v_aluno_id is null then
    raise exception 'Documento não encontrado';
  end if;

  if v_status = 'aprovado' then
    v_campo := case v_tipo
      when 'par_q' then 'parq_validade'
      when 'atestado' then 'atestado_validade'
      else null
    end;
    if v_campo is not null then
      execute format('update alunos set %I = null where id = $1', v_campo) using v_aluno_id;
    end if;
  end if;

  return query
  delete from documentos_aluno
  where id = p_documento_id
  returning documentos_aluno.url;
end;
$function$;

-- Alinha a política de UPDATE de documentos_aluno com o que a RPC
-- admin_atualizar_documento já faz na prática (só Administrador/Recepção) --
-- antes o Professor podia tecnicamente aprovar/rejeitar via RLS mesmo sem
-- conseguir ler o arquivo nem ver o botão na tela.
alter policy "documentos atualizacao equipe" on public.documentos_aluno
  using (meu_perfil() = any (array['Administrador','Recepção']))
  with check (meu_perfil() = any (array['Administrador','Recepção']));
