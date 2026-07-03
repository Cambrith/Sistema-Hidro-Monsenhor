import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessaoAluno, loginAluno, sairAluno } from "@/lib/auth-aluno";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Loader2,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-simbolo.png";

export const Route = createFileRoute("/portal")({
  head: () => ({ meta: [{ title: "Portal do Aluno" }] }),

  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    const sessao = getSessaoAluno();
    if (sessao && location.pathname === "/portal") {
      throw redirect({ to: "/portal/inicio" });
    }
    if (!sessao && location.pathname !== "/portal") {
      throw redirect({ to: "/portal" });
    }
  },

  component: PortalRoot,
});

const navPortal = [
  { to: "/portal/inicio", label: "Início", icon: Home },
  { to: "/portal/presencas", label: "Presenças", icon: CalendarDays },
  { to: "/portal/dados", label: "Meus dados", icon: ClipboardList },
  { to: "/portal/documentos", label: "Documentos", icon: FileText },
  { to: "/portal/ajuda", label: "Dúvidas", icon: HelpCircle },
];

type PendenciaDocumentos = "urgente" | "atencao" | null;

// Mesma regra usada em portal.inicio.tsx: sem validade = "ausente",
// data já passada = "vencido", a até 30 dias de vencer = "vencendo".
function statusValidade(validade?: string | null) {
  if (!validade) return "ausente";
  const diff = (new Date(validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "vencido";
  if (diff <= 30) return "vencendo";
  return "ok";
}

function PortalRoot() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/portal") return <LoginAluno />;
  return <PortalLayout />;
}

function PortalLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const sessao = getSessaoAluno();
  const [menuAberto, setMenuAberto] = useState(false);
  const [pendenciaDocumentos, setPendenciaDocumentos] = useState<PendenciaDocumentos>(null);

  useEffect(() => {
    if (!sessao) return;
    carregarPendenciaDocumentos();
  }, [sessao?.id]);

  async function carregarPendenciaDocumentos() {
    if (!sessao) return;
    const { data } = await supabase
      .from("alunos")
      .select("atestado_validade, parq_validade")
      .eq("id", sessao.id)
      .maybeSingle();
    if (!data) return;

    const statusAtestado = statusValidade(data.atestado_validade);
    const statusParq = statusValidade(data.parq_validade);
    const grave =
      statusAtestado === "vencido" || statusAtestado === "ausente" ||
      statusParq === "vencido" || statusParq === "ausente";
    const atencao = statusAtestado === "vencendo" || statusParq === "vencendo";

    setPendenciaDocumentos(grave ? "urgente" : atencao ? "atencao" : null);
  }

  function handleSair() {
    sairAluno();
    toast.success("Você saiu do portal.");
    navigate({ to: "/portal" });
  }

  const primeiroNome = sessao?.nome?.split(" ")[0] ?? "Aluno";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex flex-col items-center gap-2 border-b border-white/10 px-4 py-5">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white p-1 shadow-sm overflow-hidden">
            <img src={logo} alt="Hidro Monsenhor" className="h-full w-full scale-120 object-contain" />
          </span>
          <div className="text-center leading-tight">
            <p className="text-sm font-semibold text-sidebar-foreground">Portal do Aluno</p>
            <p className="text-xs text-sidebar-foreground/60">Hidro e Natação Monsenhor</p>
          </div>
        </div>

        <div className="px-4 py-3">
          <p className="text-xs text-sidebar-foreground/60">Olá,</p>
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{primeiroNome}</p>
        </div>

        <nav className="flex-1 px-2 py-1">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Menu
          </p>
          <ul className="space-y-0.5">
            {navPortal.map((item) => {
              const Icon = item.icon;
              const ativo = pathname === item.to;
              const mostrarBadge = item.to === "/portal/documentos" && pendenciaDocumentos;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to as never}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      ativo
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {mostrarBadge && (
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          pendenciaDocumentos === "urgente" ? "bg-red-500" : "bg-yellow-500"
                        }`}
                        aria-label={pendenciaDocumentos === "urgente" ? "Pendência urgente" : "Pendência"}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={handleSair}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white p-1 shadow-sm">
              <img src={logo} alt="Hidro Monsenhor" className="h-full w-full object-contain" />
            </span>
            <p className="text-sm font-semibold text-sidebar-foreground">Portal do Aluno</p>
          </div>
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMenuAberto((v) => !v)}
            className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent/60"
          >
            {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {menuAberto && (
          <div className="z-20 border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
            <p className="mb-2 text-xs text-sidebar-foreground/60">
              Olá, <strong className="text-sidebar-foreground">{primeiroNome}</strong>
            </p>
            <ul className="space-y-0.5">
              {navPortal.map((item) => {
                const Icon = item.icon;
                const ativo = pathname === item.to;
                const mostrarBadge = item.to === "/portal/documentos" && pendenciaDocumentos;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to as never}
                      onClick={() => setMenuAberto(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                        ativo
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {mostrarBadge && (
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            pendenciaDocumentos === "urgente" ? "bg-red-500" : "bg-yellow-500"
                          }`}
                          aria-label={pendenciaDocumentos === "urgente" ? "Pendência urgente" : "Pendência"}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 border-t border-sidebar-border pt-2">
              <button
                type="button"
                onClick={handleSair}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function formatarTelefone(valor: string) {
  const n = valor.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  return n;
}

function formatarCPF(valor: string) {
  const n = valor.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

function LoginAluno() {
  const nav = useNavigate();
  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [entrando, setEntrando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfNum = cpf.replace(/\D/g, "");
    const telNum = telefone.replace(/\D/g, "");

    if (cpfNum.length < 11) { toast.error("Informe o CPF completo (11 dígitos)."); return; }
    if (!nascimento) { toast.error("Informe a data de nascimento."); return; }
    if (telNum.length < 10) { toast.error("Informe o telefone com DDD."); return; }

    setEntrando(true);
    try {
      const sessao = await loginAluno(cpf, nascimento, telefone);
      if (!sessao) {
        toast.error("Dados não encontrados. Verifique as informações ou procure a secretaria.");
        return;
      }
      toast.success(`Bem-vindo(a), ${sessao.nome.split(" ")[0]}!`);
      nav({ to: "/portal/inicio" });
    } catch {
      toast.error("Não foi possível acessar o portal. Tente novamente.");
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="grid h-screen overflow-hidden lg:grid-cols-[0.86fr_1.14fr]">
      <div
        className="relative hidden h-screen overflow-hidden text-primary-foreground lg:block"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-9 xl:p-10">
          <div className="flex items-center gap-5">
            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-white/95 shadow-sm">
              <img src={logo} alt="Hidro e Natação Monsenhor" className="h-full w-full object-contain" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="font-display text-2xl font-semibold">Hidro e Natação Monsenhor</p>
              <p className="mt-1 max-w-[430px] text-sm leading-snug text-white/80">
                Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira
              </p>
            </div>
          </div>
          <div className="max-w-xl space-y-4 pt-6">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/65">Portal do Aluno</p>
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Acompanhe sua turma, faltas e situação cadastral.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-white/85">
              Acesse com seus dados cadastrados na secretaria para consultar suas informações.
            </p>
          </div>
          <p className="text-xs text-white/70">
            © {new Date().getFullYear()} Hidro e Natação Monsenhor — Portal do Aluno.
          </p>
        </div>
      </div>

      <div className="flex h-screen items-center justify-center overflow-y-auto bg-background px-6 py-10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Acessar minha conta</CardTitle>
            <CardDescription>
              Use os dados informados na secretaria no momento da matrícula.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">CPF do aluno</label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(formatarCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  disabled={entrando}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data de nascimento</label>
                <Input
                  type="date"
                  value={nascimento}
                  onChange={(e) => setNascimento(e.target.value)}
                  disabled={entrando}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Telefone cadastrado</label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                  placeholder="(24) 99999-0000"
                  disabled={entrando}
                  inputMode="numeric"
                  autoComplete="off"
                  type="tel"
                />
                <p className="text-xs text-muted-foreground">
                  Digite seu telefone celular ou fixo com DDD. Somente números.
                </p>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={entrando}>
                {entrando ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</>
                ) : "Entrar"}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              Dificuldades para acessar?{" "}
              <a href="/#canais-oficiais" className="font-medium hover:underline">
                Veja os canais de contato
              </a>
            </p>
            <div className="mt-6 text-center text-sm">
              <Link to="/acesso" className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}