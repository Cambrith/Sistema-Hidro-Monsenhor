create table if not exists public.tentativas_login_aluno (
  cpf text primary key,
  falhas integer not null default 0,
  bloqueado_ate timestamptz,
  atualizado_em timestamptz not null default now()
);

alter table public.tentativas_login_aluno enable row level security;
-- Sem policies de propósito: só a service role (usada pela Edge Function)
-- acessa essa tabela. anon/authenticated não têm nenhuma policy liberada.
