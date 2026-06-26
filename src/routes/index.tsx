import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
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
  Baby,
  UserRound,
  HeartPulse,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CalendarClock,
  ExternalLink,
  Instagram,
  Facebook,
  Megaphone,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { horarioSegQua, horarioTerQui } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import mapaImg from "@/assets/mapa-localizacao.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Hidro e Natação Monsenhor",
      },
      {
        name: "description",
        content:
          "Página de apoio à organização do Centro Esportivo e Cultural Prof.ª Marta Regina de Carvalho Ferreira.",
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

const instagramUrl =
  "https://www.instagram.com/hidro.monsenhor?igsh=MWZsOGhzYzMydmxnaA==";

const facebookUrl =
  "https://www.facebook.com/hidrojoaodedeus/?locale=pt_BR";

const whatsappUrl =
  "https://wa.me/552422232857?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20a%20Hidro%20e%20Nata%C3%A7%C3%A3o%20Monsenhor.";

const modalidades = [
  {
    nome: "Natação Infantil",
    desc:
      "Atividade voltada para crianças, com foco em adaptação ao meio líquido, segurança e desenvolvimento inicial na água.",
    icon: Baby,
  },
  {
    nome: "Natação Adulta",
    desc:
      "Aulas para adultos com foco em condicionamento, técnica, saúde, bem-estar e melhoria da relação com o meio aquático.",
    icon: UserRound,
  },
  {
    nome: "Hidroginástica",
    desc:
      "Exercício aquático de baixo impacto, voltado ao cuidado com a saúde, mobilidade, disposição e qualidade de vida.",
    icon: HeartPulse,
  },
];

const redesSociais = [
  {
    label: "WhatsApp",
    desc: "Fale diretamente com a equipe responsável pelo atendimento.",
    href: whatsappUrl,
    icon: FaWhatsapp,
  },
  {
    label: "Instagram",
    desc: "Acompanhe novidades, comunicados e registros das atividades.",
    href: instagramUrl,
    icon: Instagram,
  },
  {
    label: "Facebook",
    desc: "Acesse a página oficial do centro e veja atualizações.",
    href: facebookUrl,
    icon: Facebook,
  },
];

const enderecoBusca = encodeURIComponent(
  "Escola Municipal Monsenhor João de Deus Rodrigues, Pedro do Rio, Petrópolis - RJ",
);

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${enderecoBusca}`;

function formatarData(data?: string | null) {
  if (!data) return "—";

  const d = new Date(data);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("pt-BR");
}

function pareceHtml(valor: string) {
  return /<\/?[a-z][\s\S]*>/i.test(valor);
}

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textoSimplesParaHtml(texto: string) {
  return texto
    .split(/\n{2,}/)
    .map((paragrafo) => {
      const conteudo = escaparHtml(paragrafo.trim()).replace(/\n/g, "<br />");
      return conteudo ? `<p>${conteudo}</p>` : "";
    })
    .join("");
}

function sanitizarHtmlAviso(html?: string | null) {
  if (!html) return "";

  if (typeof window === "undefined") {
    return html;
  }

  const entrada = pareceHtml(html) ? html : textoSimplesParaHtml(html);

  const template = document.createElement("template");
  template.innerHTML = entrada;

  const tagsPermitidas = new Set([
    "P",
    "DIV",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "UL",
    "OL",
    "LI",
  ]);

  const elementos = Array.from(template.content.querySelectorAll("*"));

  elementos.forEach((elemento) => {
    Array.from(elemento.attributes).forEach((attr) => {
      elemento.removeAttribute(attr.name);
    });

    if (elemento.tagName === "B") {
      const strong = document.createElement("strong");
      strong.innerHTML = elemento.innerHTML;
      elemento.replaceWith(strong);
      return;
    }

    if (elemento.tagName === "I") {
      const em = document.createElement("em");
      em.innerHTML = elemento.innerHTML;
      elemento.replaceWith(em);
      return;
    }

    if (!tagsPermitidas.has(elemento.tagName)) {
      elemento.replaceWith(...Array.from(elemento.childNodes));
    }
  });

  return template.innerHTML;
}

function textoPlanoAviso(html?: string | null) {
  if (!html) return "";

  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const div = document.createElement("div");
  div.innerHTML = sanitizarHtmlAviso(html);

  div.querySelectorAll("p, div, li").forEach((elemento) => {
    elemento.append(" ");
  });

  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}

function AvisoMensagemHtml({
  mensagem,
  className = "",
}: {
  mensagem: string;
  className?: string;
}) {
  return (
    <div
      className={`space-y-2 whitespace-normal text-sm leading-relaxed [&_div]:mb-2 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-4 ${className}`}
      dangerouslySetInnerHTML={{
        __html: sanitizarHtmlAviso(mensagem),
      }}
    />
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
      modalidades: 15,
      horarios: 22,
      localizacao: 20,
      "canais-oficiais": 56,
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

      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
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
        style={{
          background: "linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[-10%] h-[420px] w-[420px] rounded-full opacity-40"
          style={{
            background: "radial-gradient(closest-side, #DBEAFE, transparent)",
          }}
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

            <p
              className="mt-4 max-w-xl text-base sm:text-lg"
              style={{ color: "#334155" }}
            >
              Página de apoio à organização do Centro Esportivo e Cultural Profª
              Marta Regina de Carvalho Ferreira, em Pedro do Rio — Petrópolis,
              RJ.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/pre-cadastro">
                <Button
                  size="lg"
                  className="bg-[#1D4ED8] text-white shadow-sm hover:bg-[#1E40AF]"
                >
                  Fazer pré-cadastro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <Link to="/acesso-rapido">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[#1D4ED8] bg-white text-[#1D4ED8] hover:bg-[#EFF6FF]"
                >
                  Acesso rápido
                </Button>
              </Link>
            </div>
          </div>

          <div className="hidden items-center justify-center md:flex">
            <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  icon: ShieldCheck,
                  label: "Gestão",
                  value: "Pública e comunitária",
                },
                {
                  icon: CalendarClock,
                  label: "Organização",
                  value: "Turmas organizadas por horário",
                },
                {
                  icon: HeartPulse,
                  label: "Atendimento",
                  value: "Cuidado com a comunidade",
                },
                {
                  icon: MapPin,
                  label: "Localização",
                  value: "Pedro do Rio, Petrópolis",
                },
              ].map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className="rounded-xl border border-[#DBEAFE] bg-white p-5 shadow-sm"
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: "#1D4ED8" }}
                    />

                    <p
                      className="mt-3 text-xs uppercase tracking-wide"
                      style={{ color: "#64748B" }}
                    >
                      {card.label}
                    </p>

                    <p
                      className="text-sm font-semibold"
                      style={{ color: "#0B1F3A" }}
                    >
                      {card.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {avisosImportantes.length > 0 && (
        <section
          id="avisos"
          className="mx-auto w-full max-w-6xl px-4 py-10 scroll-mt-16"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">
                Avisos importantes
              </h2>

              <p className="text-sm text-muted-foreground">
                Comunicados de destaque publicados pela equipe responsável.
              </p>
            </div>

            <Link to="/avisos">
              <Button variant="outline" size="sm">
                Ver todos os avisos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div
            className={
              avisosImportantes.length === 1
                ? "mt-5 max-w-2xl"
                : "mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            }
          >
            {avisosImportantes.map((aviso) => (
              <button
                key={aviso.id}
                type="button"
                onClick={() => setAvisoAberto(aviso)}
                className="group w-full text-left"
              >
                <Card className="h-full border-border/80 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Megaphone className="h-5 w-5" />
                      </span>

                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Importante
                      </span>
                    </div>

                    <div>
                      <CardTitle className="text-lg">{aviso.titulo}</CardTitle>

                      <CardDescription className="mt-1">
                        {formatarData(aviso.data)}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                      {textoPlanoAviso(aviso.mensagem)}
                    </p>

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
      )}       <section
        id="modalidades"
        className="mx-auto w-full max-w-6xl px-4 py-10 scroll-mt-16"
      >
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Modalidades oferecidas
          </h2>

          <p className="text-sm text-muted-foreground">
            Atividades pensadas para diferentes idades e objetivos.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {modalidades.map((modalidade) => {
            const Icon = modalidade.icon;

            return (
              <Card
                key={modalidade.nome}
                className="border-border/70"
                style={{
                  background: "var(--gradient-card)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <CardHeader>
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" />
                  </span>

                  <CardTitle className="mt-3 text-lg">
                    {modalidade.nome}
                  </CardTitle>
                </CardHeader>

                <CardContent className="text-sm text-foreground/80">
                  {modalidade.desc}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section
        id="horarios"
        className="mx-auto w-full max-w-6xl px-4 py-10 scroll-mt-16"
      >
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Horários das atividades
          </h2>

          <p className="text-sm text-muted-foreground">
            Grade semanal das aulas oferecidas pelo centro.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <HorariosCard titulo="Segundas e quartas" lista={horarioSegQua} />
          <HorariosCard titulo="Terças e quintas" lista={horarioTerQui} />
        </div>
      </section>

      <section
        id="localizacao"
        className="mx-auto w-full max-w-6xl px-4 py-10 scroll-mt-16"
      >
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Sobre o centro</CardTitle>

              <CardDescription>
                Espaço público de esporte, cultura e convivência.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 text-sm leading-relaxed text-foreground/80">
              <p>
                O Centro Esportivo e Cultural Profª Marta Regina de Carvalho
                Ferreira é um espaço público voltado à prática de atividades
                aquáticas, à promoção da saúde e à convivência comunitária em
                Pedro do Rio.
              </p>

              <p>
                Vinculado à Escola Municipal Monsenhor João de Deus Rodrigues, o
                centro atende moradores da região com turmas de natação
                infantil, natação adulta e hidroginástica, organizadas por
                modalidade, horário e faixa etária.
              </p>

              <p>
                Além de incentivar hábitos saudáveis, o espaço contribui para a
                socialização dos participantes, o fortalecimento do vínculo com
                a comunidade e o acesso a atividades esportivas em um ambiente
                acolhedor e organizado.
              </p>

              <p>
                Este sistema foi desenvolvido para apoiar essa rotina, reunindo
                informações sobre horários, pré-cadastros, alunos, turmas,
                presença e comunicados em uma plataforma simples e acessível.
              </p>

              <p>
                Com isso, a equipe responsável consegue acompanhar melhor os
                atendimentos, orientar alunos e responsáveis com mais clareza e
                tornar a comunicação do centro mais prática, segura e eficiente.
              </p>

              <p>
                A proposta é tornar o acesso às informações mais direto para a
                comunidade e facilitar o trabalho diário da equipe que organiza
                as atividades do centro.
              </p>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Localização
              </CardTitle>

              <CardDescription>
                Localização de referência para acesso ao centro.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-3 text-sm text-foreground/80">
              <div className="overflow-hidden rounded-lg border border-border/60">
                <img
                  src={mapaImg}
                  alt="Mapa de localização do centro"
                  className="h-auto w-full"
                />
              </div>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-auto inline-block"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir no Google Maps
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        id="canais-oficiais"
        className="mx-auto w-full max-w-6xl px-4 py-10 scroll-mt-16"
      >
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Canais oficiais
          </h2>

          <p className="text-sm text-muted-foreground">
            Acompanhe comunicados, novidades e formas de contato do centro.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {redesSociais.map((rede) => {
            const Icon = rede.icon;

            return (
              <a
                key={rede.label}
                href={rede.href}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </span>

                <h3 className="mt-4 font-semibold text-foreground">
                  {rede.label}
                </h3>

                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {rede.desc}
                </p>

                <p className="mt-3 inline-flex items-center text-sm font-medium text-primary">
                  Acessar canal
                  <ExternalLink className="ml-1 h-3.5 w-3.5 opacity-70" />
                </p>
              </a>
            );
          })}
        </div>
      </section>

      <Dialog
        open={!!avisoAberto}
        onOpenChange={(open) => !open && setAvisoAberto(null)}
      >
        <DialogContent className="sm:max-w-lg">
          {avisoAberto && (
            <>
              <DialogHeader>
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Megaphone className="h-5 w-5" />
                  </span>

                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Importante
                  </span>
                </div>

                <DialogTitle>{avisoAberto.titulo}</DialogTitle>

                <DialogDescription>
                  Publicado em {formatarData(avisoAberto.data)}
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-4">
                <AvisoMensagemHtml
                  mensagem={avisoAberto.mensagem}
                  className="text-foreground/85"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}

function HorariosCard({
  titulo,
  lista,
}: {
  titulo: string;
  lista: { hora: string; modalidade: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{titulo}</CardTitle>

        <CardDescription>{lista.length} horários disponíveis</CardDescription>
      </CardHeader>

      <CardContent className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Horário</th>
              <th className="py-2">Modalidade</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60">
            {lista.map((item) => (
              <tr key={`${item.hora}-${item.modalidade}`}>
                <td className="py-2 pr-3 font-mono text-foreground">
                  {item.hora}
                </td>

                <td className="py-2 text-foreground/80">
                  {item.modalidade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}