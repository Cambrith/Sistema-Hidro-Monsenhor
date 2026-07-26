-- Avisos: campo urgente (dispara push nativo) e direcionamento opcional por turma
alter table public.avisos
  add column if not exists urgente boolean not null default false,
  add column if not exists turma_id uuid references public.turmas(id);

comment on column public.avisos.urgente is 'Dispara push nativo (Web Push) além da notificação visual/toast padrão do portal.';
comment on column public.avisos.turma_id is 'Turma alvo do aviso no portal. NULL = todas as turmas (broadcast).';

-- Cursor de última visita do aluno à página de avisos no portal.
-- Usado só pra calcular contagem de não lidos (badge/toast) — não é leitura por aviso individual.
create table public.avisos_visitas_portal (
  aluno_id uuid primary key references public.alunos(id) on delete cascade,
  visto_em timestamptz not null default now()
);
alter table public.avisos_visitas_portal enable row level security;
-- Sem policies diretas: acesso exclusivamente via RPC SECURITY DEFINER.

-- Inscrições de push (Web Push / VAPID) por aluno.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  criado_em timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
-- Sem policies diretas: acesso exclusivamente via RPC SECURITY DEFINER / Edge Function (service role).
create index push_subscriptions_aluno_id_idx on public.push_subscriptions(aluno_id);
