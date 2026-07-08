import { Link, useRouterState } from "@tanstack/react-router";
import { useIsStandalone } from "@/hooks/use-install-prompt";
import {
  Home,
  CalendarDays,
  ClipboardList,
  FileText,
  Megaphone,
  HelpCircle,
  LogOut,
  Globe,
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
  useSidebar,
} from "@/components/ui/sidebar";

import logo from "@/assets/logo-simbolo.png";

export type PendenciaDocumentos = "urgente" | "atencao" | null;

type MenuItemPortal = {
  to: string;
  label: string;
  icon: typeof Home;
};

const navPortal: MenuItemPortal[] = [
  { to: "/portal/inicio", label: "Início", icon: Home },
  { to: "/portal/presencas", label: "Presenças", icon: CalendarDays },
  { to: "/portal/dados", label: "Meus dados", icon: ClipboardList },
  { to: "/portal/documentos", label: "Documentos", icon: FileText },
  { to: "/portal/avisos", label: "Avisos", icon: Megaphone },
  { to: "/portal/ajuda", label: "Dúvidas", icon: HelpCircle },
];

function isActivePath(current: string, to: string) {
  return current === to || current.startsWith(`${to}/`);
}

function MenuLinkPortal({
  item,
  current,
  pendenciaDocumentos,
}: {
  item: MenuItemPortal;
  current: string;
  pendenciaDocumentos: PendenciaDocumentos;
}) {
  const Icon = item.icon;
  const { isMobile, setOpenMobile } = useSidebar();
  const mostrarBadge = item.to === "/portal/documentos" && pendenciaDocumentos;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActivePath(current, item.to)}
        tooltip={item.label}
      >
        <Link
          to={item.to as never}
          onClick={() => {
            // No celular o menu é um painel deslizante (Sheet) — sem isso,
            // ele fica aberto depois de você navegar pra outra página.
            if (isMobile) setOpenMobile(false);
          }}
        >
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
          {mostrarBadge && (
            <span
              className={`ml-auto h-2 w-2 shrink-0 rounded-full ${
                pendenciaDocumentos === "urgente" ? "bg-red-500" : "bg-yellow-500"
              }`}
              aria-label={pendenciaDocumentos === "urgente" ? "Pendência urgente" : "Pendência"}
            />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function PortalSidebar({
  nomeAluno,
  pendenciaDocumentos,
  onSair,
}: {
  nomeAluno: string;
  pendenciaDocumentos: PendenciaDocumentos;
  onSair: () => void;
}) {
  const current = useRouterState({ select: (s) => s.location.pathname });
const isStandalone = useIsStandalone();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm group-data-[collapsible=icon]:size-7 group-data-[collapsible=icon]:p-1">
            <img
              src={logo}
              alt="Hidro e Natação Monsenhor"
              className="h-full w-full scale-140 object-contain"
            />
          </span>

          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-display text-sm font-semibold text-sidebar-foreground">
              Portal do Aluno
            </span>
            <span className="truncate text-[11px] text-sidebar-foreground/70">
              Hidro e Natação Monsenhor
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navPortal.map((item) => (
                <MenuLinkPortal
                  key={item.to}
                  item={item}
                  current={current}
                  pendenciaDocumentos={pendenciaDocumentos}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 pt-2">
        <div className="px-2 py-1.5 text-xs text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-[11px] text-sidebar-foreground/60">Olá,</p>
          <p className="truncate font-semibold text-sidebar-foreground">{nomeAluno}</p>
        </div>

        <SidebarMenu>
          {!isStandalone && (
  <SidebarMenuItem>
    <SidebarMenuButton asChild tooltip="Voltar ao site">
      <Link to="/">
        <Globe className="h-4 w-4" />
        <span>Voltar ao Site</span>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}

          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sair" onClick={onSair}>
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}