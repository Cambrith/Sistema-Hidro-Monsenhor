-- Tabela sem nenhuma referência no frontend nem em funções do banco,
-- resquício de antes de public.perfis existir. Sem FK apontando pra ela
-- nem dela pra outra tabela.
drop table if exists public.usuarios;
