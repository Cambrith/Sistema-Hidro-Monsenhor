import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CheckSquare,
  Megaphone,
  BarChart3,
  Shield,
  UserCog,
  LogOut,
  FileText,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

import { getSessao, podeAcessar, sair, type Permissao } from "@/lib/auth";

import logo from "@/assets/Golfinho Solitario (2.0).png"; 

type MenuItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permissao: Permissao;
};

const operacao: MenuItem[] = [
  {
    to: "/painel",
    label: "Painel",
    icon: LayoutDashboard,
    permissao: "painel",
  },
  {
    to: "/alunos",
    label: "Alunos",
    icon: Users,
    permissao: "alunos",
  },
  {
    to: "/turmas",
    label: "Turmas",
    icon: CalendarDays,
    permissao: "turmas",
  },
  {
    to: "/presenca",
    label: "Presença",
    icon: CheckSquare,
    permissao: "presenca",
  },
  {
    to: "/avisos-admin",
    label: "Avisos",
    icon: Megaphone,
    permissao: "avisos",
  },
  {
    to: "/documentos",
    label: "Documentos",
    icon: FileText,
    permissao: "alunos",
  },
  {
    to: "/relatorios",
    label: "Relatórios",
    icon: BarChart3,
    permissao: "relatorios",
  },
];

const sistema: MenuItem[] = [
  {
    to: "/usuarios",
    label: "Usuários e Perfis",
    icon: UserCog,
    permissao: "usuarios",
  },
  {
    to: "/seguranca",
    label: "Segurança e Backup",
    icon: Shield,
    permissao: "seguranca",
  },
];

function isActivePath(current: string, to: string) {
  return current === to || current.startsWith(`${to}/`);
}

function areaPorPerfil(perfil?: string) {
  if (perfil === "Administrador") return "Administração";
  if (perfil === "Recepção") return "Recepção";
  if (perfil === "Professor") return "Professor";

  return "Equipe";
}

function descricaoPorPerfil(perfil?: string) {
  if (perfil === "Administrador") return "Acesso completo";
  if (perfil === "Recepção") return "Atendimento e gestão";
  if (perfil === "Professor") return "Turmas e chamada";

  return "Acesso interno";
}

function MenuLink({
  item,
  current,
}: {
  item: MenuItem;
  current: string;
}) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActivePath(current, item.to)}
        tooltip={item.label}
      >
        <Link to={item.to as never}>
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AdminSidebar() {
  const navigate = useNavigate();
  const current = useRouterState({ select: (s) => s.location.pathname });
  const sessao = getSessao();

  const operacaoVisivel = operacao.filter((item) => podeAcessar(item.permissao));
  const sistemaVisivel = sistema.filter((item) => podeAcessar(item.permissao));

  const areaExibicao = areaPorPerfil(sessao?.perfil);
  const descricaoExibicao = descricaoPorPerfil(sessao?.perfil);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm">
  <img
    src={logo}
    alt="Hidro e Natação Monsenhor"
    className="h-full w-full object-contain"
  />
</span>

          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-display text-sm font-semibold text-sidebar-foreground">
              Painel Monsenhor
            </span>

            <span className="truncate text-[11px] text-sidebar-foreground/70">
              Hidro e Natação Monsenhor
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {operacaoVisivel.map((item) => (
                <MenuLink key={item.to} item={item} current={current} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sistemaVisivel.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {sistemaVisivel.map((item) => (
                  <MenuLink key={item.to} item={item} current={current} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 pt-2">
        <div className="px-2 py-1.5 text-xs text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-[11px] text-sidebar-foreground/60">
</p>
<p className="truncate font-semibold text-sidebar-foreground">
  {sessao?.nome?.split(" ")[0] ?? areaExibicao}
</p>
<p className="truncate text-[11px] text-sidebar-foreground/65">
  {descricaoExibicao}
</p>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={() => {
                sair();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}