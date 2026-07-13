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
import {
  getSessaoAluno,
  identificarAluno,
  verificarAluno,
  sairAluno,
  type SessaoAluno,
  type FatorLogin,
} from "@/lib/auth-aluno";
import { statusBloqueio, registrarTentativaFalha, limparTentativas } from "@/lib/rate-limit";
import { statusValidade } from "@/lib/validade";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { PortalSidebar, type PendenciaDocumentos } from "@/components/portal-sidebar";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { useIsStandalone } from "@/hooks/use-install-prompt";
import { ArrowLeft, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-simbolo.png";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Portal do Aluno" },
      { name: "apple-mobile-web-app-title", content: "Portal do Aluno" },
    ],
    links: [{ rel: "manifest", href: "/manifest.json" }],
  }),

  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const sessao = await getSessaoAluno();
    if (sessao && location.pathname === "/portal") {
      throw redirect({ to: "/portal/inicio" });
    }
    if (!sessao && location.pathname !== "/portal") {
      throw redirect({ to: "/portal" });
    }
  },

  component: PortalRoot,
});

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
  const [sessao, setSessao] = useState<SessaoAluno | null>(null);
  const [pendenciaDocumentos, setPendenciaDocumentos] = useState<PendenciaDocumentos>(null);

  useEffect(() => {
    getSessaoAluno().then(setSessao);
  }, []);

  useEffect(() => {
    if (!sessao) return;
    carregarPendenciaDocumentos();
  }, [sessao?.id]);

  async function carregarPendenciaDocumentos() {
    if (!sessao) return;
    const { data } = await supabase.rpc("portal_dados_inicio", {
      p_aluno_id: sessao.id,
    });
    const alunoData = data?.[0];
    if (!alunoData) return;

    const statusAtestado = statusValidade(alunoData.atestado_validade);
    const statusParq = statusValidade(alunoData.parq_validade);
    const grave =
      statusAtestado === "vencido" ||
      statusAtestado === "ausente" ||
      statusParq === "vencido" ||
      statusParq === "ausente";
    const atencao = statusAtestado === "vencendo" || statusParq === "vencendo";

    setPendenciaDocumentos(grave ? "urgente" : atencao ? "atencao" : null);
  }

  async function handleSair() {
    await sairAluno();
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
            <p className="truncate font-display text-sm font-semibold">{tituloAtual}</p>
          </header>

          <PwaInstallBanner />

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
  setEstado: (v: string) => void,
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

type EtapaLogin = "identificar" | "verificar" | "manual";

const ESCOPO_BLOQUEIO_ALUNO = "aluno";
const MAX_TENTATIVAS_ALUNO = 5;
const BLOQUEIO_ALUNO_MS = 5 * 60 * 1000;

function rotuloTerceiroFator(fator: FatorLogin | null): string {
  if (fator === "endereco") return "Endereço cadastrado";
  return "Nome da mãe";
}

function placeholderTerceiroFator(fator: FatorLogin | null): string {
  if (fator === "endereco") return "Rua, número, bairro...";
  return "Nome completo da mãe";
}

function LoginAluno() {
  const isStandalone = useIsStandalone();
  const nav = useNavigate();

  const [etapa, setEtapa] = useState<EtapaLogin>("identificar");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [nascimentoISO, setNascimentoISO] = useState<string | null>(null);
  const [fator, setFator] = useState<FatorLogin | null>(null);
  const [valorTerceiroFator, setValorTerceiroFator] = useState("");
  const [entrando, setEntrando] = useState(false);

  function voltarParaIdentificacao() {
    setEtapa("identificar");
    setFator(null);
    setValorTerceiroFator("");
  }

  function tratarBloqueioServidor(segundosRestantes: number) {
    const minutos = Math.max(1, Math.ceil(segundosRestantes / 60));
    toast.error(
      `Muitas tentativas erradas. Tente novamente em ${minutos} minuto${minutos > 1 ? "s" : ""}.`,
    );
  }

  const handleIdentificar = async (e: React.FormEvent) => {
    e.preventDefault();

    const bloqueio = statusBloqueio(ESCOPO_BLOQUEIO_ALUNO);
    if (bloqueio.bloqueado) {
      const minutos = Math.ceil(bloqueio.segundosRestantes / 60);
      toast.error(
        `Muitas tentativas erradas. Tente novamente em ${minutos} minuto${minutos > 1 ? "s" : ""}.`,
      );
      return;
    }

    const nomeValido = nomeCompleto.trim().split(/\s+/).filter(Boolean).length >= 2;
    const iso = dataNascimentoParaISO(nascimento);

    if (!nomeValido) {
      toast.error("Informe o nome completo do aluno (nome e sobrenome).");
      return;
    }
    if (!iso) {
      toast.error("Informe a data de nascimento completa (dia, mês e ano).");
      return;
    }

    setEntrando(true);
    try {
      const resultado = await identificarAluno(nomeCompleto.trim(), iso);

      if (!resultado.ok) {
        if (resultado.bloqueado) {
          tratarBloqueioServidor(resultado.segundosRestantes);
        } else {
          toast.error(resultado.erro);
        }
        return;
      }

      setNascimentoISO(iso);
      setFator(resultado.fator);
      setEtapa(resultado.fator === "manual" ? "manual" : "verificar");
    } catch (erro) {
      console.error("ERRO IDENTIFICAR ALUNO:", erro);
      toast.error("Não foi possível verificar seus dados agora. Tente novamente.");
    } finally {
      setEntrando(false);
    }
  };

  const handleVerificar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nascimentoISO) {
      voltarParaIdentificacao();
      return;
    }

    const bloqueio = statusBloqueio(ESCOPO_BLOQUEIO_ALUNO);
    if (bloqueio.bloqueado) {
      const minutos = Math.ceil(bloqueio.segundosRestantes / 60);
      toast.error(
        `Muitas tentativas erradas. Tente novamente em ${minutos} minuto${minutos > 1 ? "s" : ""}.`,
      );
      return;
    }

    if (!valorTerceiroFator.trim()) {
      toast.error(`Informe ${fator === "endereco" ? "o endereço" : "o nome da mãe"} cadastrado.`);
      return;
    }

    setEntrando(true);
    try {
      const resultado = await verificarAluno(
        nomeCompleto.trim(),
        nascimentoISO,
        valorTerceiroFator.trim(),
      );

      if (!resultado.ok) {
        if (resultado.bloqueado) {
          tratarBloqueioServidor(resultado.segundosRestantes);
          return;
        }

        const tentativa = registrarTentativaFalha(
          ESCOPO_BLOQUEIO_ALUNO,
          MAX_TENTATIVAS_ALUNO,
          BLOQUEIO_ALUNO_MS,
        );

        if (tentativa.bloqueado) {
          const minutos = Math.ceil(tentativa.segundosRestantes / 60);
          toast.error(`Muitas tentativas erradas. Acesso bloqueado por ${minutos} minutos.`);
        } else {
          toast.error(`${resultado.erro} Tentativas restantes: ${tentativa.tentativasRestantes}.`);
        }
        return;
      }

      limparTentativas(ESCOPO_BLOQUEIO_ALUNO);
      toast.success(`Bem-vindo(a), ${resultado.sessao.nome.split(" ")[0]}!`);
      nav({ to: "/portal/inicio" });
    } catch (erro) {
      console.error("ERRO VERIFICAR ALUNO:", erro);
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
        <div
          aria-hidden
          className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative flex h-full flex-col justify-between p-9 xl:p-10">
          <div className="flex items-center gap-5">
            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-white/95 shadow-sm">
              <img
                src={logo}
                alt="Hidro e Natação Monsenhor"
                className="h-full w-full object-contain"
              />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="font-display text-2xl font-semibold">Hidro e Natação Monsenhor</p>
              <p className="mt-1 max-w-107.5 text-sm leading-snug text-white/80">
                Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira
              </p>
            </div>
          </div>
          <div className="max-w-xl space-y-4 pt-6">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/65">
              Portal do Aluno
            </p>
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Acompanhe sua jornada aquática, em um só lugar.
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
          {etapa === "identificar" && (
            <>
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl">Acessar minha conta</CardTitle>
                <CardDescription>
                  Use os dados informados na secretaria no momento da matrícula.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleIdentificar} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Nome completo do aluno</label>
                    <Input
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      placeholder="Nome completo, como cadastrado na secretaria"
                      disabled={entrando}
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
                  <Button type="submit" className="w-full" size="lg" disabled={entrando}>
                    {entrando ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Continuar"
                    )}
                  </Button>
                </form>
                <RodapeAjuda isStandalone={isStandalone} />
              </CardContent>
            </>
          )}

          {etapa === "verificar" && (
            <>
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl">Confirme sua identidade</CardTitle>
                <CardDescription>
                  Pra concluir, informe mais um dado cadastrado na matrícula.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerificar} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{rotuloTerceiroFator(fator)}</label>
                    <Input
                      value={valorTerceiroFator}
                      onChange={(e) => setValorTerceiroFator(e.target.value)}
                      placeholder={placeholderTerceiroFator(fator)}
                      disabled={entrando}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={entrando}>
                    {entrando ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={voltarParaIdentificacao}
                    disabled={entrando}
                    className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Corrigir nome ou data de nascimento
                  </button>
                </form>
                <RodapeAjuda isStandalone={isStandalone} />
              </CardContent>
            </>
          )}

          {etapa === "manual" && (
            <>
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl">
                  Não conseguimos confirmar automaticamente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="leading-relaxed text-muted-foreground">
                    Não encontramos nome da mãe nem endereço cadastrados pra confirmar sua
                    identidade automaticamente. Procure a secretaria do Centro Esportivo pra liberar
                    seu acesso ao portal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={voltarParaIdentificacao}
                  className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function RodapeAjuda({ isStandalone }: { isStandalone: boolean }) {
  return (
    <>
      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        Dificuldades para acessar?{" "}
        <a href="/#canais-oficiais" className="font-medium hover:underline">
          Veja os canais de contato
        </a>
      </p>
      {!isStandalone && (
        <div className="mt-6 text-center text-sm">
          <Link
            to="/acesso"
            className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar ao início
          </Link>
        </div>
      )}
    </>
  );
}
