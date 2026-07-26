-- Contexto: o portal do aluno passou a emitir sessão Supabase Auth real
-- (verifyOtp via garantir-usuario-aluno). Isso invalidou a premissa antiga
-- de que "auth.uid() IS NOT NULL" identificava só a equipe. Como um aluno
-- logado não tem linha em public.perfis, meu_perfil() retorna NULL pra ele
-- e a comparação abaixo nunca autoriza — corrigindo o vazamento sem
-- precisar de tabela nova.

alter policy "alunos leitura equipe" on public.alunos
  using (meu_perfil() = any (array['Administrador','Recepção','Professor']));

alter policy "alunos_turmas leitura autenticados" on public.alunos_turmas
  using (meu_perfil() = any (array['Administrador','Recepção','Professor']));

alter policy "turmas leitura autenticados" on public.turmas
  using (meu_perfil() = any (array['Administrador','Recepção','Professor']));

alter policy "chamadas leitura equipe" on public.chamadas
  using (meu_perfil() = any (array['Administrador','Recepção','Professor']));

alter policy "presencas leitura autenticados" on public.presencas
  using (meu_perfil() = any (array['Administrador','Recepção','Professor']));

alter policy "ocorrencias leitura equipe" on public.ocorrencias_alunos
  using (meu_perfil() = any (array['Administrador','Recepção']));

alter policy "avisos leitura autenticados" on public.avisos
  using (meu_perfil() = any (array['Administrador','Recepção']));
-- "avisos leitura publica" (ativo=true and publico=true) não é tocada.

-- documentos_aluno: a política existente comparava aluno_id (espaço
-- alunos.id) com o sub do JWT (espaço auth.users.id/alunos.auth_user_id) —
-- nunca batia. Corrige pra comparar o espaço de ID certo.
alter policy "aluno ve proprios documentos" on public.documentos_aluno
  using (aluno_id = (select id from public.alunos where auth_user_id = auth.uid()));

-- documentos_aluno nunca teve política de SELECT pra equipe — o contador
-- de "documentos pendentes" do dashboard sempre lia 0 silenciosamente.
create policy "documentos leitura equipe" on public.documentos_aluno
  for select
  using (meu_perfil() = any (array['Administrador','Recepção']));

-- Função morta: resquício da autenticação antiga por CPF, sem nenhuma
-- referência no frontend nem em outras funções do banco.
drop function if exists public.verificar_login_aluno(text, date, text);
