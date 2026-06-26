# Painel Hidro e Natação Monsenhor — Plano do Protótipo

Sistema web responsivo, institucional e acessível, totalmente em **português brasileiro**, com área pública para a comunidade e área administrativa para recepção/equipe. Dados fictícios, sem backend real (autenticação e persistência simuladas em memória/localStorage).

## Identidade visual

- Paleta institucional: **azul-marinho** (primária), **azul-claro** (acento), **branco** e **cinza suave**.
- Estilo limpo, moderno, com cards organizados, ícones simples (lucide-react), botões grandes, bom contraste e leitura mobile.
- Tokens semânticos definidos em `src/styles.css` (oklch): `--primary` (navy), `--accent` (light blue), `--background` (white), `--muted` (soft gray), além de `--gradient-hero` e `--shadow-card`.
- Tipografia: Inter (corpo) + Plus Jakarta Sans (títulos), via Google Fonts.

## Arquitetura de rotas (TanStack Router, file-based)

Área pública (layout com cabeçalho + rodapé institucional):
- `src/routes/index.tsx` — Página inicial pública
- `src/routes/pre-cadastro.tsx` — Formulário de pré-cadastro + mensagem de sucesso
- `src/routes/acesso-rapido.tsx` — Linktree + QR Codes simulados
- `src/routes/avisos.tsx` — Avisos públicos
- `src/routes/login.tsx` — Login administrativo

Área administrativa (layout com sidebar colapsável + topbar, protegida por guard simulado):
- `src/routes/_admin.tsx` — Layout protegido (verifica "sessão" em localStorage; redireciona para `/login`)
- `src/routes/_admin/painel.tsx` — Painel/Dashboard
- `src/routes/_admin/pre-cadastros.tsx` — Gestão de pré-cadastros
- `src/routes/_admin/alunos.tsx` — Alunos cadastrados
- `src/routes/_admin/turmas.tsx` — Turmas
- `src/routes/_admin/presenca.tsx` — Controle de presença
- `src/routes/_admin/avisos.tsx` — Gestão de avisos
- `src/routes/_admin/relatorios.tsx` — Relatórios + exportação CSV/PDF (demonstrativa)
- `src/routes/_admin/seguranca.tsx` — Indicadores de segurança e backup
- `src/routes/_admin/usuarios.tsx` — Perfis (Administrador, Recepção, Professor)

Cada rota define `head()` próprio com `title` e `description` em pt-BR.

## Telas — detalhes

1. **Página inicial pública**: hero com nome do centro e frase institucional, cards das modalidades (Natação Infantil, Natação Adulta, Hidroginástica), seção "Sobre", localização (Petrópolis/RJ), botões para Pré-cadastro, WhatsApp, Instagram, Facebook, Linktree, bloco de avisos importantes e botão "Área administrativa".
2. **Pré-cadastro**: formulário com seções Dados do aluno, Dados do responsável; validação com `react-hook-form` + `zod`; toast de sucesso com a mensagem especificada; grava em localStorage para aparecer no admin.
3. **Login administrativo**: e-mail/usuário + senha; aceita qualquer credencial demo (ex.: `admin@monsenhor / 123456`) e grava sessão simulada.
4. **Painel administrativo**: cards de resumo (total de alunos, pré-cadastros pendentes, turmas ativas, presença do dia, avisos recentes, fila de espera) + mini gráfico (Recharts) e lista de atividades recentes.
5. **Pré-cadastros**: tabela com status (pendente/aprovado/fila/recusado/inativo), ações: visualizar (drawer), alterar status, aprovar, fila de espera, recusar, converter em aluno.
6. **Alunos**: lista + busca por nome, filtros (modalidade, turma, status), botão adicionar manualmente (dialog), editar, alterar status, vincular à turma.
7. **Turmas**: cards/tabela com nome, modalidade, dias/horário, professor, faixa etária, vagas, inscritos, status (ativa/encerrada/em formação). Exemplos fictícios conforme briefing.
8. **Presença**: selecionar turma → data → lista de alunos com radio (Presente / Falta / Falta justificada) → Salvar; histórico simples por turma.
9. **Avisos**: CRUD de avisos (título, mensagem, data, importante, exibir no público); exemplos prontos (alteração de horário, manutenção da piscina, etc.). Vista pública lista os marcados como públicos.
10. **Relatórios**: cards numéricos + tabelas simples (alunos por modalidade/turma, presença por período, faltas por aluno, pendentes, fila, vagas) + botões "Exportar CSV" e "Exportar PDF" (CSV real via Blob; PDF demonstrativo com toast).
11. **Acesso Rápido / QR Codes**: grid de botões (Pré-cadastro, WhatsApp, Instagram, Facebook, Localização, Horários, Avisos, Modalidades) + área com QR Codes simulados (gerados via `qrcode.react`) para pré-cadastro, Linktree, localização e avisos.
12. **Segurança e backup**: tela com indicadores visuais (login/senha, controle de acesso, coleta mínima, backup periódico simulado com data/hora, exportação de dados, senhas protegidas).
13. **Usuários/Perfis**: visualização dos três perfis (Administrador, Recepção, Professor) com matriz de permissões — apenas visual.

## Dados fictícios

Camada simples em `src/lib/mock-data.ts` (alunos, turmas, pré-cadastros, presenças, avisos) inicializada em localStorage na primeira visita, com hooks utilitários (`useAlunos`, `useTurmas`, etc.) para leitura/escrita reativa. Nenhum dado real.

## Stack e dependências

- TanStack Router + Query (já no template), Tailwind v4, shadcn/ui (sidebar, card, table, dialog, drawer, form, input, select, tabs, badge, toast/sonner, separator).
- Adicionar: `qrcode.react` para QR Codes; `recharts` (provavelmente já presente via shadcn chart) para mini gráficos do painel.
- Sem Supabase / sem backend nesta entrega (estruturado para futura troca por Lovable Cloud).

## Acessibilidade & responsividade

- Contraste AA, foco visível, labels associados, navegação por teclado.
- Layout mobile-first: sidebar vira drawer no mobile, tabelas com scroll horizontal, cards empilháveis.

## Entregáveis

Protótipo navegável cobrindo todas as 11 telas exigidas, pronto para apresentação escolar/profissional, com visual institucional moderno e dados de demonstração coerentes.
