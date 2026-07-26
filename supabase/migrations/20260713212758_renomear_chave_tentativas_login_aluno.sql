-- A coluna se chamava "telefone" (resquício do login antigo por CPF+nascimento+
-- telefone). O login novo não usa mais telefone nem CPF como fator de
-- autenticação — a chave de bloqueio passa a ser um hash de
-- nome-normalizado+nascimento. Renomeando pra refletir isso.
--
-- Nota: o código de produção atual (função garantir-usuario-aluno v6) referencia
-- uma coluna "cpf" que nunca existiu nesta tabela com esse nome — ou seja, o
-- bloqueio de tentativas já estava de fato inoperante antes desta mudança.
alter table public.tentativas_login_aluno rename column telefone to chave;
