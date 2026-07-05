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
import { statusBloqueio, registrarTentativaFalha, limparTentativas } from "@/lib/rate-limit";
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
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { PortalSidebar, type PendenciaDocumentos } from "@/components/portal-sidebar";
import { ArrowLeft, Loader2 } from "lucide-react";
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

const titulosPortal: Record<string, string> = {
  "/portal/inicio": "Início",
  "/portal/presencas": "Presenças",
  "/portal/dados": "Meus dados",
  "/portal/documentos": "Documentos",
  "/portal/avisos": "Avisos",
  "/portal/ajuda": "Dúvidas",
};

function PortalLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const sessao = getSessaoAluno();
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
  const tituloAtual = titulosPortal[path] ?? "Portal do Aluno";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <PortalSidebar
          nomeAluno={primeiroNome}
          pendenciaDocumentos={pendenciaDocumentos}
          onSair={handleSair}
        />

        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <p className="truncate font-display text-sm font-semibold">
              {tituloAtual}
            </p>
          </header>

          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function handleMaskedChange(
  e: React.ChangeEvent<HTMLInputElement>,
  formatarFn: (v: string) => string,
  setEstado: (v: string) => void
) {
  const input = e.target;
  const valorAntigo = input.value;
  const selecaoStart = input.selectionStart || 0;

  const digitosAntesDoCursor = valorAntigo.slice(0, selecaoStart).replace(/\D/g, "").length;

  const valorFormatado = formatarFn(valorAntigo);
  setEstado(valorFormatado);

  setTimeout(() => {
    let novaPosicao = 0;
    let digitosEncontrados = 0;

    while (digitosEncontrados < digitosAntesDoCursor && novaPosicao < valorFormatado.length) {
      if (/\d/.test(valorFormatado[novaPosicao])) {
        digitosEncontrados++;
      }
      novaPosicao++;
    }

    input.setSelectionRange(novaPosicao, novaPosicao);
  }, 0);
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

function formatarDataNascimento(valor: string) {
  const n = valor.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

function dataNascimentoParaISO(valor: string): string | null {
  const n = valor.replace(/\D/g, "");
  if (n.length !== 8) return null;

  const dia = n.slice(0, 2);
  const mes = n.slice(2, 4);
  const ano = n.slice(4, 8);

  const diaNum = Number(dia);
  const mesNum = Number(mes);
  const anoNum = Number(ano);

  if (diaNum < 1 || diaNum > 31) return null;
  if (mesNum < 1 || mesNum > 12) return null;
  if (anoNum < 1900 || anoNum > new Date().getFullYear()) return null;

  return `${ano}-${mes}-${dia}`;
}

function LoginAluno() {
  const nav = useNavigate();
  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [entrando, setEntrando] = useState(false);

  const MAX_TENTATIVAS_ALUNO = 5;
  const BLOQUEIO_ALUNO_MS = 5 * 60 * 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bloqueio = statusBloqueio("aluno");

    if (bloqueio.bloqueado) {
      const minutos = Math.ceil(bloqueio.segundosRestantes / 60);
      toast.error(
        `Muitas tentativas erradas. Tente novamente em ${minutos} minuto${minutos > 1 ? "s" : ""}.`,
      );
      return;
    }

    const cpfNum = cpf.replace(/\D/g, "");
    const telNum = telefone.replace(/\D/g, "");
    const nascimentoISO = dataNascimentoParaISO(nascimento);

    if (cpfNum.length < 11) { toast.error("Informe o CPF completo (11 dígitos)."); return; }
    if (!nascimentoISO) { toast.error("Informe a data de nascimento completa (dia, mês e ano)."); return; }
    if (telNum.length < 10) { toast.error("Informe o telefone com DDD."); return; }

    setEntrando(true);
    try {
      const sessao = await loginAluno(cpf, nascimentoISO, telefone);
      if (!sessao) {
        const resultado = registrarTentativaFalha(
          "aluno",
          MAX_TENTATIVAS_ALUNO,
          BLOQUEIO_ALUNO_MS,
        );

        if (resultado.bloqueado) {
          const minutos = Math.ceil(resultado.segundosRestantes / 60);
          toast.error(
            `Muitas tentativas erradas. Acesso bloqueado por ${minutos} minutos.`,
          );
        } else {
          toast.error(
            `Dados não encontrados. Verifique as informações ou procure a secretaria. Tentativas restantes: ${resultado.tentativasRestantes}.`,
          );
        }

        return;
      }

      limparTentativas("aluno");
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
  Acompanhe sua jornada na natação, em um só lugar.
</h2>
<p className="max-w-md text-sm leading-relaxed text-white/85">
  Presenças, faltas, sua turma, documentos (atestado e PAR-Q) e avisos da secretaria.
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
                <label className="text-sm font-medium">CPF do Aluno</label>
                <Input
                  value={cpf}
                  onChange={(e) => handleMaskedChange(e, formatarCPF, setCpf)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  disabled={entrando}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data de Nascimento</label>
                <Input
                  value={nascimento}
                  onChange={(e) => handleMaskedChange(e, formatarDataNascimento, setNascimento)}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  disabled={entrando}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Telefone Cadastrado</label>
                <Input
                  value={telefone}
                  onChange={(e) => handleMaskedChange(e, formatarTelefone, setTelefone)}
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