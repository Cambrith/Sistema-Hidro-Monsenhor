import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/public-layout";
import {
  ClipboardCheck,
  MessageCircle,
  MapPin,
  Clock,
  Megaphone,
  ListChecks,
  Stethoscope,
  CalendarCheck,
  Phone,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/acesso-rapido")({
  head: () => ({
    meta: [
      { title: "Acesso Rápido" },
      {
        name: "description",
        content:
          "Atalhos e informações importantes sobre como se inscrever, avisos, horários, modalidades, localização e canais oficiais.",
      },
    ],
  }),
  component: AcessoRapido,
});

type LinkItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  hint?: string;
};

const links: LinkItem[] = [
  {
    label: "Como se inscrever",
    icon: ClipboardCheck,
    href: "/pre-cadastro",
    hint: "Passo a passo da matrícula",
  },
  {
    label: "Avisos",
    icon: Megaphone,
    href: "/avisos",
    hint: "Comunicados recentes",
  },
  {
    label: "Horários",
    icon: Clock,
    href: "/#horarios",
    hint: "Grade semanal",
  },
  {
    label: "Modalidades",
    icon: ListChecks,
    href: "/#modalidades",
    hint: "Atividades oferecidas",
  },
  {
    label: "Localização",
    icon: MapPin,
    href: "/#localizacao",
    hint: "Como chegar",
  },
  {
    label: "Canais oficiais",
    icon: MessageCircle,
    href: "/#canais-oficiais",
    hint: "WhatsApp e redes sociais",
  },
];

const infos = [
  {
    title: "Documentos obrigatórios",
    text: "A matrícula exige atestado médico atualizado e documento de identificação com foto. Para menores de idade, o responsável deve estar presente.",
    icon: Stethoscope,
  },
  {
    title: "Organização das turmas",
    text: "As turmas são organizadas por modalidade e faixa etária, com dias e horários fixos por semana. Confira a grade na página inicial.",
    icon: CalendarCheck,
  },
  {
    title: "Regra de faltas",
    text: "4 ou mais faltas sem justificativa formal em um mesmo mês resultam no cancelamento da vaga. Faltas justificadas não contam para esse limite.",
    icon: AlertCircle,
  },
  {
    title: "Troca de horário",
    text: "A troca de turma é permitida a cada 3 meses, salvo exceções avaliadas pela secretaria. Para solicitar, compareça pessoalmente.",
    icon: Clock,
  },
];

function AcessoRapido() {
  function abrirAtalho(href: string) {
    window.location.href = href;
  }

  return (
    <PublicLayout>
      <section className="mx-auto w-full max-w-5xl px-4 py-10">

        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold">Central de acesso</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atalhos para os principais recursos, informações e canais oficiais do centro.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Button
                key={link.label}
                variant="outline"
                onClick={() => abrirAtalho(link.href)}
                className="h-auto w-full justify-start gap-3 py-4 text-left"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{link.label}</span>
                  {link.hint && (
                    <span className="text-[11px] text-muted-foreground">{link.hint}</span>
                  )}
                </span>
              </Button>
            );
          })}
        </div>
        <div className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Informações importantes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Orientações sobre documentos, faltas e organização das turmas.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {infos.map((info) => {
              const Icon = info.icon;
              return (
                <Card key={info.title} className="h-full">
  <CardContent className="flex h-full flex-col p-5">
    <span className="mb-4 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
      <Icon className="h-5 w-5" />
    </span>
    <h3 className="text-sm font-semibold text-foreground">{info.title}</h3>
    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
      {info.text}
    </p>
  </CardContent>
</Card>
              );
            })}
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Esta página tem caráter informativo. Para informações atualizadas, entre em contato com a secretaria.
        </p>

      </section>
    </PublicLayout>
  );
}