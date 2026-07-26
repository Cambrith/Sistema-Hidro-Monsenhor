import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/componentes/ui/sidebar";
import { AdminSidebar } from "@/componentes/barra-lateral-admin";
import { PwaInstallBanner } from "@/componentes/banner-instalacao-app";
import { getSessao, sincronizarSessao, permissoesPorPerfil, type Permissao, type Sessao } from "@/utilitarios/autenticacao";
import { Separator } from "@/componentes/ui/separator";
import { Badge } from "@/componentes/ui/badge";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [{ name: "apple-mobile-web-app-title", content: "Painel" }],
    links: [
      { rel: "manifest", href: "/manifest-admin.json" },
      { rel: "apple-touch-icon", href: "/admin-icons/apple-touch-icon.png" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;

    const sessao = await sincronizarSessao();

    if (!sessao) {
      // /painel/login precisa ficar acessível sem sessão — senão o redirect
      // abaixo mandaria pra si mesma (loop). Ela cuida da própria checagem
      // (redireciona pra /painel se já tiver sessão).
      if (location.pathname === "/painel/login") return;
      throw redirect({ to: "/painel/login" });
    }

    const permissaoNecessaria = permissaoDaRota(location.pathname);

    if (!permissaoNecessaria) return;

    const permissoes = permissoesPorPerfil[sessao.perfil] ?? [];

    if (!permissoes.includes(permissaoNecessaria)) {
      throw redirect({ to: "/painel" });
    }
  },
  component: PainelRoot,
});

// Fonte única de verdade: título exibido no topo + permissão exigida de
// cada rota do admin. Antes isso vivia em dois objetos separados (títulos
// e permissões) — foi exatamente por causa disso que "/pre-cadastros"
// ficou meses mostrando o título "Pré-cadastros" mesmo depois de virar
// Lista de Espera. Agora é um lugar só, difícil de esquecer de atualizar.
type ConfigRotaAdmin = {
  title: string;
  sub?: string;
  permissao?: Permissao;
};

const configRotasAdmin: Record<string, ConfigRotaAdmin> = {
  "/painel": {
    title: "Painel",
    sub: "Visão geral do centro",
    permissao: "painel",
  },
  "/painel/pre-cadastros": {
    title: "Lista de Espera",
    sub: "Fila de espera por modalidade e turma",
    // Confirmado em lib/auth.ts: Administrador e Recepção têm tanto
    // "pre-cadastros" quanto "alunos", então nunca ficam dessincronizados
    // na prática — mas continuam sendo permissões distintas, então se
    // criar um perfil novo no futuro, dê as duas juntas.
    permissao: "pre-cadastros",
  },
  "/painel/documentos": {
    title: "Documentos",
    sub: "Atestados e documentos enviados pelos alunos",
    // Antes esta rota não tinha entrada aqui = nenhuma checagem de
    // permissão. Qualquer perfil logado (até Professor) conseguia entrar
    // digitando a URL direto, mesmo sem o link aparecer no menu. Usei
    // "alunos" pra bater com a permissão que já controla o link no menu.
    permissao: "alunos",
  },
  "/painel/alunos": {
    title: "Alunos",
    sub: "Cadastro e gestão dos estudantes",
    permissao: "alunos",
  },
  "/painel/turmas": {
    title: "Turmas",
    sub: "Organização das atividades",
    permissao: "turmas",
  },
  "/painel/presenca": {
    title: "Presença",
    sub: "Controle digital de frequência",
    permissao: "presenca",
  },
  "/painel/avisos-admin": {
    title: "Avisos",
    sub: "Comunicação com a comunidade",
    permissao: "avisos",
  },
  "/painel/relatorios": {
    title: "Relatórios",
    sub: "Indicadores e exportações",
    permissao: "relatorios",
  },
  "/painel/banco-dados": {
    title: "Banco de Dados",
    sub: "Contagem de registros, integridade, RLS, storage e backup",
    permissao: "seguranca",
  },
  "/painel/aplicacao": {
    title: "Aplicação / Deploy",
    sub: "Deploy atual, service worker e variáveis de ambiente",
    permissao: "seguranca",
  },
  "/painel/seguranca-acessos": {
    title: "Segurança e Acessos",
    sub: "Equipe, permissões e tentativas de login",
    permissao: "seguranca",
  },
};

function configDaRota(pathname: string): ConfigRotaAdmin | null {
  if (configRotasAdmin[pathname]) return configRotasAdmin[pathname];

  const encontrada = Object.entries(configRotasAdmin).find(([rota]) => {
    return pathname === rota || pathname.startsWith(`${rota}/`);
  });

  return encontrada?.[1] ?? null;
}

function permissaoDaRota(pathname: string): Permissao | null {
  return configDaRota(pathname)?.permissao ?? null;
}

function getMeta(pathname: string) {
  const config = configDaRota(pathname);
  return {
    title: config?.title ?? "Painel administrativo",
    sub: config?.sub,
  };
}

function perfilClassName(sessao: Sessao | null) {
  if (!sessao) return "border-border bg-muted text-muted-foreground";

  if (sessao.perfil === "Administrador") {
    return "bg-primary text-primary-foreground";
  }

  if (sessao.perfil === "Recepção") {
    return "border border-border bg-accent text-accent-foreground";
  }

  return "border border-border bg-secondary text-secondary-foreground";
}

function podeEntrarNaRota(pathname: string, sessao: Sessao | null) {
  if (!sessao) return false;

  const permissaoNecessaria = permissaoDaRota(pathname);

  if (!permissaoNecessaria) return true;

  const permissoes = permissoesPorPerfil[sessao.perfil] ?? [];

  return permissoes.includes(permissaoNecessaria);
}

// A tela de login (painel.login.tsx) fica nesta mesma árvore de rotas por
// causa da convenção de arquivos (painel.login.tsx é filha de painel.tsx),
// mas não pode ganhar a sidebar/header do admin — senão o formulário de
// login apareceria embrulhado no chrome do painel. Por isso o componente
// desta rota decide entre o Outlet "nu" (login) e o AdminLayout completo
// (todo o resto), igual ao padrão já usado em portal.tsx.
function PainelRoot() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/painel/login") return <Outlet />;
  return <AdminLayout />;
}

function AdminLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const meta = getMeta(path);
  const sessao = getSessao();

  useEffect(() => {
    if (!sessao) {
      navigate({ to: "/painel/login" });
      return;
    }

    if (!podeEntrarNaRota(path, sessao)) {
      navigate({ to: "/painel" });
    }
  }, [path, sessao, navigate]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background print:block print:min-h-0 print:bg-white">
        <div className="print:hidden">
          <AdminSidebar />
        </div>

        <SidebarInset className="print:m-0 print:block print:w-full print:max-w-none">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-4 print:hidden">
            <SidebarTrigger />

            <Separator orientation="vertical" className="h-6" />

            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate font-display text-sm font-semibold">{meta.title}</p>

              {meta.sub && <p className="truncate text-xs text-muted-foreground">{meta.sub}</p>}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Badge className={perfilClassName(sessao)}>{sessao?.perfil ?? "Sem perfil"}</Badge>
            </div>
          </header>

          {sessao && (
            <div className="print:hidden">
              <PwaInstallBanner app="admin" titulo="Instale o app do Painel" />
            </div>
          )}

          <main className="flex-1 px-4 py-6 md:px-6 print:p-0">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
