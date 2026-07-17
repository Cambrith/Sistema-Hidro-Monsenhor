import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/componentes/layout-publico";
import {
  ClipboardCheck,
  MessageCircle,
  MapPin,
  Clock,
  Megaphone,
  ListChecks,
  Phone,
  AlertCircle,
  DoorOpen,
  Waves,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent } from "@/componentes/ui/card";
import { regrasCentro } from "@/utilitarios/regras-centro";

export const Route = createFileRoute("/acesso-rapido")({
  head: () => ({
    meta: [
      { title: "Dúvidas Frequentes" },
      {
        name: "description",
        content:
          "Respostas rápidas sobre vagas, faltas, documentos e demais dúvidas comuns do Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira.",
      },
    ],
  }),
  component: AcessoRapido,
});

const telefoneFixo = "tel:+552422452089";
const whatsappUrl =
  "https://wa.me/552422232857?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20sobre%20vagas%20na%20Hidro%20e%20Nata%C3%A7%C3%A3o%20Monsenhor.";

type Atalho = {
  label: string;
  to: string;
  hash?: string;
  icon: LucideIcon;
};

const atalhos: Atalho[] = [
  { label: "Horários das aulas", to: "/", hash: "horarios", icon: Clock },
  { label: "Modalidades oferecidas", to: "/", hash: "modalidades", icon: ListChecks },
  { label: "Localização", to: "/", hash: "localizacao", icon: MapPin },
  { label: "Avisos da secretaria", to: "/avisos", icon: Megaphone },
  { label: "Como se inscrever", to: "/pre-cadastro", icon: ClipboardCheck },
  { label: "Canais oficiais", to: "/", hash: "canais-oficiais", icon: MessageCircle },
];

function AcessoRapido() {
  return (
    <PublicLayout>
      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold">Central de Dúvidas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Respostas rápidas para as perguntas que mais recebemos na secretaria.
          </p>
        </div>

        {/* As duas dúvidas mais comuns */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="h-full border-primary/20" style={{ background: "var(--gradient-card)" }}>
            <CardContent className="flex h-full flex-col gap-4 p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <DoorOpen className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Tem vaga disponível?</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  As vagas abrem no primeiro dia útil do mês e costumam ser poucas, já que o
                  atendimento é gratuito. A forma mais rápida de confirmar é ligando ou contatando a
                  secretaria antes de se deslocar.
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <a href={telefoneFixo}>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    (24) 2245-2089
                  </Button>
                </a>
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" className="gap-2 bg-[#25D366] text-white hover:bg-[#1DA851]">
                    <FaWhatsapp className="h-3.5 w-3.5" />
                    Chamar no WhatsApp
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full border-primary/20" style={{ background: "var(--gradient-card)" }}>
            <CardContent className="flex h-full flex-col gap-4 p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <AlertCircle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Posso faltar sem perder a vaga?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {regrasCentro.find((r) => r.titulo === "Faltas")?.texto}
                </p>
              </div>
              <div className="mt-auto pt-2">
                <Link to="/acesso">
                  <Button size="sm" variant="outline" className="gap-2">
                    <Waves className="h-3.5 w-3.5" />
                    Ver minhas faltas no portal
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outras dúvidas comuns */}
        <div className="mt-10">
          <h2 className="font-display text-xl font-semibold">Outras dúvidas comuns</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Orientações sobre documentos, uniforme e organização das turmas.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {regrasCentro
              .filter((r) => r.titulo !== "Faltas")
              .map((regra) => {
                const Icon = regra.icon;
                return (
                  <Card key={regra.titulo} className="h-full">
                    <CardContent className="flex h-full flex-col p-5">
                      <span className="mb-4 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">{regra.titulo}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {regra.texto}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>

        {/* Outros atalhos */}
        <div className="mt-10">
          <h2 className="font-display text-xl font-semibold">Outros atalhos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso direto às demais páginas e seções do site.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {atalhos.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  hash={link.hash}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  {link.label}
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Esta página tem caráter informativo. Para informações atualizadas, entre em contato com a
          secretaria.
        </p>
      </section>
    </PublicLayout>
  );
}
