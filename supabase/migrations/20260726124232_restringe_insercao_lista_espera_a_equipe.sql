-- "pre_cadastros insercao publica" (WITH CHECK true) permitia INSERT
-- irrestrito por qualquer um com a chave anon, direto via API REST, sem
-- precisar de formulário nenhum (confirmado: não existe form público ativo
-- hoje). Mas é a mesma política que painel.pre-cadastros.tsx usa pro
-- cadastro manual da equipe -- por isso substitui em vez de só remover.
drop policy "pre_cadastros insercao publica" on public.lista_espera;

create policy "pre_cadastros insercao equipe"
  on public.lista_espera
  for insert
  with check (meu_perfil() = any (array['Administrador','Recepção']));
