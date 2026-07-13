import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { getSessao, permissoesPorPerfil, type Permissao, type Sessao } from "@/lib/auth";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_admin")({
  head: () => ({
    meta: [{ name: "apple-mobile-web-app-title", content: "Painel Monsenhor" }],
    links: [{ rel: "manifest", href: "/manifest-admin.json" }],
  }),
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;

    const sessao = getSessao();

    if (!sessao) {
      throw redirect({ to: "/login" });
    }

    const permissaoNecessaria = permissaoDaRota(location.pathname);

    if (!permissaoNecessaria) return;

    const permissoes = permissoesPorPerfil[sessao.perfil] ?? [];

    if (!permissoes.includes(permissaoNecessaria)) {
      throw redirect({ to: "/painel" });
    }
  },
  component: AdminLayout,
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
  "/pre-cadastros": {
    title: "Lista de Espera",
    sub: "Fila de espera por modalidade e turma",
    // Confirmado em lib/auth.ts: Administrador e Recepção têm tanto
    // "pre-cadastros" quanto "alunos", então nunca ficam dessincronizados
    // na prática — mas continuam sendo permissões distintas, então se
    // criar um perfil novo no futuro, dê as duas juntas.
    permissao: "pre-cadastros",
  },
  "/documentos": {
    title: "Documentos",
    sub: "Atestados e documentos enviados pelos alunos",
    // Antes esta rota não tinha entrada aqui = nenhuma checagem de
    // permissão. Qualquer perfil logado (até Professor) conseguia entrar
    // digitando a URL direto, mesmo sem o link aparecer no menu. Usei
    // "alunos" pra bater com a permissão que já controla o link no menu.
    permissao: "alunos",
  },
  "/alunos": {
    title: "Alunos",
    sub: "Cadastro e gestão dos estudantes",
    permissao: "alunos",
  },
  "/turmas": {
    title: "Turmas",
    sub: "Organização das atividades",
    permissao: "turmas",
  },
  "/presenca": {
    title: "Presença",
    sub: "Controle digital de frequência",
    permissao: "presenca",
  },
  "/avisos-admin": {
    title: "Avisos",
    sub: "Comunicação com a comunidade",
    permissao: "avisos",
  },
  "/relatorios": {
    title: "Relatórios",
    sub: "Indicadores e exportações",
    permissao: "relatorios",
  },
  "/seguranca": {
    title: "Segurança e Backup",
    sub: "Boas práticas e indicadores",
    permissao: "seguranca",
  },
  "/usuarios": {
    title: "Usuários e Perfis",
    sub: "Permissões da equipe",
    permissao: "usuarios",
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

function AdminLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const meta = getMeta(path);
  const sessao = getSessao();

  useEffect(() => {
    if (!sessao) {
      navigate({ to: "/login" });
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
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur print:hidden">
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

          <div className="print:hidden">
            <PwaInstallBanner app="admin" titulo="Instale o app do Painel" />
          </div>

          <main className="flex-1 px-4 py-6 md:px-6 print:p-0">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
