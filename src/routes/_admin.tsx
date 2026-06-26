import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import {
  getSessao,
  permissoesPorPerfil,
  type Permissao,
  type Sessao,
} from "@/lib/auth";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_admin")({
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

const titles: Record<string, { title: string; sub?: string }> = {
  "/painel": { title: "Painel", sub: "Visão geral do centro" },
  "/pre-cadastros": {
    title: "Pré-cadastros",
    sub: "Solicitações recebidas pela equipe",
  },
  "/alunos": { title: "Alunos", sub: "Cadastro e gestão dos estudantes" },
  "/turmas": { title: "Turmas", sub: "Organização das atividades" },
  "/presenca": { title: "Presença", sub: "Controle digital de frequência" },
  "/avisos-admin": { title: "Avisos", sub: "Comunicação com a comunidade" },
  "/relatorios": { title: "Relatórios", sub: "Indicadores e exportações" },
  "/seguranca": {
    title: "Segurança e Backup",
    sub: "Boas práticas e indicadores",
  },
  "/usuarios": { title: "Usuários e Perfis", sub: "Permissões da equipe" },
};

const permissoesRotas: Record<string, Permissao> = {
  "/painel": "painel",
  "/pre-cadastros": "pre-cadastros",
  "/alunos": "alunos",
  "/turmas": "turmas",
  "/presenca": "presenca",
  "/avisos-admin": "avisos",
  "/relatorios": "relatorios",
  "/seguranca": "seguranca",
  "/usuarios": "usuarios",
};

function permissaoDaRota(pathname: string): Permissao | null {
  const rotaExata = permissoesRotas[pathname];

  if (rotaExata) return rotaExata;

  const rotaEncontrada = Object.entries(permissoesRotas).find(([rota]) => {
    return pathname === rota || pathname.startsWith(`${rota}/`);
  });

  return rotaEncontrada?.[1] ?? null;
}

function getMeta(pathname: string) {
  const metaExata = titles[pathname];

  if (metaExata) return metaExata;

  const metaEncontrada = Object.entries(titles).find(([rota]) => {
    return pathname === rota || pathname.startsWith(`${rota}/`);
  });

  return metaEncontrada?.[1] ?? { title: "Painel administrativo" };
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
              <p className="truncate font-display text-sm font-semibold">
                {meta.title}
              </p>

              {meta.sub && (
                <p className="truncate text-xs text-muted-foreground">
                  {meta.sub}
                </p>
              )}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Badge className={perfilClassName(sessao)}>
                {sessao?.perfil ?? "Sem perfil"}
              </Badge>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6 print:p-0">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}