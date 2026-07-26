-- As políticas "aluno vê o próprio X" usavam uma subquery direta em
-- `alunos` pra descobrir o id do aluno a partir de auth_user_id. Só que
-- essa subquery roda com o papel de quem chamou (authenticated), então
-- fica sujeita à própria RLS de `alunos` -- que desde a correção da
-- Tarefa 1 só permite equipe ler direto. Resultado: a subquery sempre
-- voltava NULL pro aluno, e a política nunca deixava ele ver nem o
-- próprio dado. Corrige com uma função SECURITY DEFINER (mesmo padrão de
-- meu_perfil()/eh_admin()), que bypassa a RLS de alunos só pra essa
-- checagem pontual de identidade.
create or replace function public.meu_aluno_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select id from alunos where auth_user_id = auth.uid() limit 1;
$function$;

alter policy "aluno ve proprios documentos" on public.documentos_aluno
  using (aluno_id = meu_aluno_id());

alter policy "aluno le proprios documentos storage" on storage.objects
  using (
    bucket_id = 'documentos-aluno'
    and (storage.foldername(name))[1] = meu_aluno_id()::text
  );

alter policy "aluno envia proprios documentos storage" on storage.objects
  with check (
    bucket_id = 'documentos-aluno'
    and (storage.foldername(name))[1] = meu_aluno_id()::text
  );
