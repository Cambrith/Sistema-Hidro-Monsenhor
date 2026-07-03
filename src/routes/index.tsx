import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { AvisoMensagemHtml, textoPlanoAviso } from "@/lib/sanitizar-aviso";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PersonStanding,
  UserRound,
  Phone,
  HeartPulse,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CalendarClock,
  ExternalLink,
  Instagram,
  Facebook,
  Megaphone,
  X,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { horarioSegQua, horarioTerQui, type Modalidade } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import mapaImg from "@/assets/mapa-localizacao.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hidro e Natação Monsenhor" },
      {
        name: "description",
        content:
          "Página de apoio à organização do Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira.",
      },
    ],
  }),
  component: Home,
});

type Aviso = {
  id: string;
  titulo: string;
  mensagem: string;
  data: string;
  importante: boolean;
  publico: boolean;
  ativo?: boolean;
};

type FiltroDia = "todos" | "seg-qui" | "ter-qua";
type FiltroTurno = "todos" | "Manhã" | "Tarde" | "Noite";
type FiltroModalidade = "todos" | Modalidade;

const instagramUrl =
  "https://www.instagram.com/hidro.monsenhor?igsh=MWZsOGhzYzMydmxnaA==";
const facebookUrl =
  "https://www.facebook.com/hidrojoaodedeus/?locale=pt_BR";
const whatsappUrl =
  "https://wa.me/552422232857?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20a%20Hidro%20e%20Nata%C3%A7%C3%A3o%20Monsenhor.";

const modalidades = [
  {
    nome: "Natação Infantil",
    faixa: "7 a 17 anos",
   desc: "As aulas focam em adaptação ao meio líquido, desenvolvimento das técnicas de nado, segurança na água e evolução progressiva conforme a faixa etária.",
    icon: PersonStanding,
  },
  {
    nome: "Natação Adulta",
    faixa: "A partir de 18 anos",
   desc: "As aulas trabalham técnica, condicionamento físico e bem-estar, atendendo desde quem está aprendendo a nadar até quem busca aprimorar a prática.",
    icon: UserRound,
  },
  {
    nome: "Hidroginástica",
    faixa: "A partir de 18 anos",
    desc: "Exercício aquático de baixo impacto indicado para quem busca qualidade de vida, mobilidade e condicionamento com menor sobrecarga nas articulações.",
    icon: HeartPulse,
  },
];

const redesSociais = [
  {
    label: "Telefone Fixo",
    desc: "Ligue para confirmar vagas ou tirar dúvidas com a secretaria.",
    href: "tel:+552422452089",
    icon: Phone,
    detalhe: "(24) 2245-2089",
  },
  {
    label: "WhatsApp",
    desc: "Fale diretamente com a equipe responsável pelo atendimento.",
    href: whatsappUrl,
    icon: FaWhatsapp,
    detalhe: "(24) 2223-2857",
  },
  {
    label: "Instagram",
    desc: "Acompanhe novidades, comunicados e registros das atividades.",
    href: instagramUrl,
    icon: Instagram,
    detalhe: "@hidro.monsenhor",
  },
  {
    label: "Facebook",
    desc: "Acesse a página oficial do centro e veja atualizações.",
    href: facebookUrl,
    icon: Facebook,
    detalhe: "@hidrojoaodedeus",
  },
];

const enderecoBusca = encodeURIComponent(
  "Escola Municipal Monsenhor João de Deus Rodrigues, Pedro do Rio, Petrópolis - RJ",
);
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${enderecoBusca}`;

type HorarioItem = {
  hora: string;
  modalidade: Modalidade;
  dia: "seg-qui" | "ter-qua";
  turno: "Manhã" | "Tarde" | "Noite";
};

function calcularTurno(hora: string): "Manhã" | "Tarde" | "Noite" {
  const h = parseInt(hora.slice(0, 2), 10);
  if (h >= 6 && h < 12) return "Manhã";
  if (h >= 12 && h < 18) return "Tarde";
  return "Noite";
}

const todosHorarios: HorarioItem[] = [
  ...horarioSegQua.map((h) => ({
    hora: h.hora,
    modalidade: h.modalidade,
    dia: "seg-qui" as const,
    turno: calcularTurno(h.hora),
  })),
  ...horarioTerQui.map((h) => ({
    hora: h.hora,
    modalidade: h.modalidade,
    dia: "ter-qua" as const,
    turno: calcularTurno(h.hora),
  })),
].sort((a, b) => a.hora.localeCompare(b.hora));

const badgeModalidade: Record<Modalidade, string> = {
  "Natação Infantil": "bg-blue-50 text-blue-700 border border-blue-200",
  "Natação Adulta": "bg-indigo-50 text-indigo-700 border border-indigo-200",
  "Hidroginástica": "bg-teal-50 text-teal-700 border border-teal-200",
};

function formatarData(data?: string | null) {
  if (!data) return "—";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        ativo
          ? "border-[#1D4ED8] bg-[#1D4ED8] text-white"
          : "border-border bg-background text-muted-foreground hover:border-[#1D4ED8]/50 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function TabelaHorarios() {
  const [filtroDia, setFiltroDia] = useState<FiltroDia>("todos");
  const [filtroModalidade, setFiltroModalidade] = useState<FiltroModalidade>("todos");
  const [filtroTurno, setFiltroTurno] = useState<FiltroTurno>("todos");

  const filtrado = todosHorarios.filter((h) => {
    if (filtroDia !== "todos" && h.dia !== filtroDia) return false;
    if (filtroModalidade !== "todos" && h.modalidade !== filtroModalidade) return false;
    if (filtroTurno !== "todos" && h.turno !== filtroTurno) return false;
    return true;
  });

  const filtrosAtivos =
    filtroDia !== "todos" || filtroModalidade !== "todos" || filtroTurno !== "todos";

  function limparFiltros() {
    setFiltroDia("todos");
    setFiltroModalidade("todos");
    setFiltroTurno("todos");
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4">

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dia</span>
          <div className="flex flex-wrap gap-1.5">
            <Chip ativo={filtroDia === "todos"} onClick={() => setFiltroDia("todos")}>Todos</Chip>
            <Chip ativo={filtroDia === "seg-qui"} onClick={() => setFiltroDia("seg-qui")}>Segundas e Quartas</Chip>
<Chip ativo={filtroDia === "ter-qua"} onClick={() => setFiltroDia("ter-qua")}>Terças e Quintas</Chip>
          </div>
        </div>

        <div className="h-px bg-border/50" />

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Turno</span>
          <div className="flex flex-wrap gap-1.5">
            <Chip ativo={filtroTurno === "todos"} onClick={() => setFiltroTurno("todos")}>Todos</Chip>
            <Chip ativo={filtroTurno === "Manhã"} onClick={() => setFiltroTurno("Manhã")}>Manhã</Chip>
            <Chip ativo={filtroTurno === "Tarde"} onClick={() => setFiltroTurno("Tarde")}>Tarde</Chip>
            <Chip ativo={filtroTurno === "Noite"} onClick={() => setFiltroTurno("Noite")}>Noite</Chip>
          </div>
        </div>

        <div className="h-px bg-border/50" />

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modalidade</span>
          <div className="flex flex-wrap gap-1.5">
            <Chip ativo={filtroModalidade === "todos"} onClick={() => setFiltroModalidade("todos")}>Todas</Chip>
            <Chip ativo={filtroModalidade === "Natação Infantil"} onClick={() => setFiltroModalidade("Natação Infantil")}>Natação Infantil</Chip>
            <Chip ativo={filtroModalidade === "Natação Adulta"} onClick={() => setFiltroModalidade("Natação Adulta")}>Natação Adulta</Chip>
            <Chip ativo={filtroModalidade === "Hidroginástica"} onClick={() => setFiltroModalidade("Hidroginástica")}>Hidroginástica</Chip>
          </div>
        </div>

        {filtrosAtivos && (
          <>
            <div className="h-px bg-border/50" />
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Limpar filtros
            </button>
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtrado.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum horário encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="max-h-[340px] overflow-x-auto overflow-y-auto">
              <table className="min-w-[500px] w-full text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Horário</th>
                    <th className="px-4 py-3">Dias</th>
                    <th className="px-3 py-3">Turno</th>
                    <th className="px-3 py-3">Modalidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtrado.map((item, i) => (
                    <tr
                      key={`${item.dia}-${item.hora}-${item.modalidade}-${i}`}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-2.5 font-mono text-foreground">{item.hora}</td>
                      <td className="px-4 py-2.5 text-foreground/70">
                        {item.dia === "seg-qui" ? "Segundas e Quartas" : "Terças e Quintas"}
                      </td>
                      <td className="px-4 py-2.5 text-foreground/70">{item.turno}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeModalidade[item.modalidade]}`}>
                          {item.modalidade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <div className="border-t border-border/50 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            {filtrado.length} {filtrado.length === 1 ? "horário exibido" : "horários exibidos"}
            {filtrosAtivos && ` · ${todosHorarios.length} no total`}
          </p>
        </div>
      </Card>
    </div>
  );
}

function Home() {
  const [avisosImportantes, setAvisosImportantes] = useState<Aviso[]>([]);
  const [avisoAberto, setAvisoAberto] = useState<Aviso | null>(null);

  useEffect(() => {
    carregarAvisosImportantes();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scrollFromQuery = params.get("scroll");
    const scrollFromHash = window.location.hash.replace("#", "");
    const scroll = scrollFromHash || scrollFromQuery;
    if (!scroll) return;

    const ajustePorSecao: Record<string, number> = {
      avisos: 28,
      modalidades: 1,
      horarios: 5,
      localizacao: 15,
      "canais-oficiais": 10,
    };

    setTimeout(() => {
      const element = document.getElementById(scroll);
      if (!element) return;
      const headerOffset = 104;
      const ajusteVisual = ajustePorSecao[scroll] ?? 48;
      const top =
        element.getBoundingClientRect().top +
        window.scrollY -
        headerOffset +
        ajusteVisual;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 200);
  }, []);

  async function carregarAvisosImportantes() {
    const { data, error } = await supabase
      .from("avisos")
      .select("*")
      .eq("publico", true)
      .eq("importante", true)
      .eq("ativo", true)
      .order("data", { ascending: false })
      .limit(3);

    if (error) {
      console.error(error);
      return;
    }

    setAvisosImportantes((data ?? []) as Aviso[]);
  }

  return (
    <PublicLayout>
      <section
        className="relative overflow-hidden border-b border-border"
        style={{ background: "linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[-10%] h-[420px] w-[420px] rounded-full opacity-40"
          style={{ background: "radial-gradient(closest-side, #DBEAFE, transparent)" }}
        />

        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <h1
              className="font-display text-4xl font-bold leading-tight sm:text-5xl md:text-6xl"
              style={{ color: "#0B1F3A" }}
            >
              Hidro e Natação{" "}
              <span style={{ color: "#1D4ED8" }}>Monsenhor</span>
            </h1>

            <p className="mt-4 max-w-xl text-base sm:text-lg" style={{ color: "#334155" }}>
              Página de apoio à organização do Centro Esportivo e Cultural Professora
              Marta Regina de Carvalho Ferreira.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
  <Link to="/pre-cadastro">
    <Button size="lg" className="bg-[#1D4ED8] text-white shadow-sm hover:bg-[#1E40AF]">
      Como se inscrever
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </Link>
  <Link to="/acesso-rapido">
    <Button size="lg" variant="outline" className="border-[#1D4ED8] bg-white text-[#1D4ED8] hover:bg-[#EFF6FF]">
      Acesso rápido
    </Button>
  </Link>
</div>
          </div>

          <div className="hidden items-center justify-center md:flex">
            <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
             {[
  { icon: ShieldCheck, label: "Acesso", value: "Atividades 100% gratuitas" },
  { icon: HeartPulse, label: "Alunos ativos", value: "Mais de 650 alunos matriculados" },
  { icon: CalendarClock, label: "Funcionando desde", value: "2005" },
  { icon: MapPin, label: "Localização", value: "Pedro do Rio, Petrópolis" },
].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-xl border border-[#DBEAFE] bg-white p-5 shadow-sm">
                    <Icon className="h-5 w-5" style={{ color: "#1D4ED8" }} />
                    <p className="mt-3 text-xs uppercase tracking-wide" style={{ color: "#64748B" }}>{card.label}</p>
                    <p className="text-sm font-semibold" style={{ color: "#0B1F3A" }}>{card.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {avisosImportantes.length > 0 && (
        <section id="avisos" className="mx-auto w-full max-w-6xl px-4 py-10 scroll-mt-16">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">Avisos importantes</h2>
              <p className="text-sm text-muted-foreground">Comunicados de destaque publicados pela equipe responsável.</p>
            </div>
            <Link to="/avisos">
              <Button variant="outline" size="sm">
                Ver todos os avisos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className={avisosImportantes.length === 1 ? "mt-5 max-w-2xl" : "mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3"}>
            {avisosImportantes.map((aviso) => (
              <button key={aviso.id} type="button" onClick={() => setAvisoAberto(aviso)} className="group w-full text-left">
                <Card className="h-full border-border/80 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Megaphone className="h-5 w-5" />
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Importante</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{aviso.titulo}</CardTitle>
                      <CardDescription className="mt-1">{formatarData(aviso.data)}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">{textoPlanoAviso(aviso.mensagem)}</p>
                    <p className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                      Ler aviso completo
                      <ArrowRight className="ml-1 h-3.5 w-3.5 opacity-70 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </section>
      )}

      <section id="modalidades" className="mx-auto w-full max-w-6xl px-4 py-10 scroll-mt-16">
        <div>
          <h2 className="font-display text-2xl font-semibold">Modalidades oferecidas</h2>
          <p className="text-sm text-muted-foreground">Atividades pensadas para diferentes idades e objetivos.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {modalidades.map((modalidade) => {
            const Icon = modalidade.icon;
            return (
              <Card key={modalidade.nome} className="border-border/70" style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}>
                <CardHeader>
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="mt-3 text-lg">{modalidade.nome}</CardTitle>
         <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeModalidade[modalidade.nome as Modalidade]}`}>
            {modalidade.faixa}
          </span>
        </CardHeader>
        <CardContent className="-mt-2 text-sm text-foreground/80">{modalidade.desc}</CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="horarios" className="mx-auto w-full max-w-6xl px-4 py-10 scroll-mt-16">
        <div>
          <h2 className="font-display text-2xl font-semibold">Horários das atividades</h2>
          <p className="text-sm text-muted-foreground">
            Grade semanal das aulas oferecidas pelo centro. Use os filtros para encontrar o horário ideal.
          </p>
        </div>
        <TabelaHorarios />
      </section>

      <section id="localizacao" className="mx-auto w-full max-w-6xl px-4 py-10 scroll-mt-16">
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Sobre o centro</CardTitle>
              <CardDescription>Espaço público de esporte, cultura e convivência.</CardDescription>
            </CardHeader>
           <CardContent className="flex-1 space-y-4 text-sm leading-relaxed text-foreground/80">
  <p>
    O Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira é um espaço público dedicado à prática de atividades aquáticas, à promoção da saúde e ao fortalecimento da convivência comunitária em Pedro do Rio.
  </p>
  <p>
    Vinculado à Escola Municipal Monsenhor João de Deus Rodrigues, o centro oferece turmas de natação infantil, natação adulta e hidroginástica, organizadas por modalidade, faixa etária e horários, atendendo moradores de Pedro do Rio e de regiões próximas.

  </p>
  <p>
  Com atuação desde o início dos anos 2000, o centro já atendeu milhares de
  alunos ao longo dos anos. O espaço leva o nome da professora Marta Regina
  de Carvalho Ferreira, docente de história e diretora adjunta da unidade por
  16 anos, homenageada após seu falecimento pelo compromisso e dedicação à
  comunidade de Pedro do Rio.
</p>
  <p>
    Além de contar com infraestrutura adequada para a prática das atividades, o espaço é atualmente a única opção gratuita de atividades aquáticas entre os distritos de Pedro do Rio, Posse e Itaipava, ampliando o acesso ao esporte e incentivando a qualidade de vida da comunidade.

  </p>
  <p>
    Todas as atividades são oferecidas gratuitamente. As inscrições são
realizadas exclusivamente de forma presencial, diretamente no local,
nos horários de atendimento da secretaria.
  </p>
</CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Localização
              </CardTitle>
              <CardDescription>Localização de referência para acesso ao centro.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 text-sm text-foreground/80">
              <div className="overflow-hidden rounded-lg border border-border/60">
                <img src={mapaImg} alt="Mapa de localização do centro" className="h-auto w-full" />
              </div>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-auto inline-block">
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir no Google Maps
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="canais-oficiais" className="mx-auto w-full max-w-6xl px-4 py-10 scroll-mt-16">
        <div>
          <h2 className="font-display text-2xl font-semibold">Canais oficiais</h2>
          <p className="text-sm text-muted-foreground">Acompanhe comunicados, novidades e formas de contato do centro.</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {redesSociais.map((rede) => {
            const Icon = rede.icon;
            return (
              <a key={rede.label} href={rede.href} target="_blank" rel="noreferrer" className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-foreground">{rede.label}</h3>
{"detalhe" in rede && rede.detalhe && (
  <p className="mt-0.5 text-sm font-semibold text-foreground">
    {rede.detalhe}
  </p>
)}
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{rede.desc}</p>
                <p className="mt-auto pt-3 inline-flex items-center text-sm font-medium text-primary">
                  Acessar canal
                  <ExternalLink className="ml-1 h-3.5 w-3.5 opacity-70" />
                </p>
              </a>
            );
          })}
        </div>
      </section>

      <Dialog open={!!avisoAberto} onOpenChange={(open) => !open && setAvisoAberto(null)}>
        <DialogContent className="sm:max-w-lg">
          {avisoAberto && (
            <>
              <DialogHeader>
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Megaphone className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Importante</span>
                </div>
                <DialogTitle>{avisoAberto.titulo}</DialogTitle>
                <DialogDescription>Publicado em {formatarData(avisoAberto.data)}</DialogDescription>
              </DialogHeader>
              <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-4">
                <AvisoMensagemHtml mensagem={avisoAberto.mensagem} className="text-foreground/85" />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}