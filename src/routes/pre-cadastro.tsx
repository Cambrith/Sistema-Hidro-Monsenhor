import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  ClipboardCheck,
  FileText,
  HelpCircle,
  IdCard,
  MapPin,
  Phone,
  Stethoscope,
} from "lucide-react";

export const Route = createFileRoute("/pre-cadastro")({
  head: () => ({
    meta: [
      { title: "Como se inscrever" },
      {
        name: "description",
        content:
          "Saiba como funciona a inscrição no Centro Esportivo e Cultural Profª Marta Regina de Carvalho Ferreira.",
      },
    ],
  }),
  component: ComoSeInscreverPage,
});

const documentos = [
  {
    icon: Stethoscope,
    titulo: "Atestado médico",
    descricao: "Comprovando aptidão física para natação e/ou hidroginástica.",
  },
  {
    icon: IdCard,
    titulo: "Documento de identificação",
    descricao: "RG ou outro documento com foto do participante (ou do responsável, se menor de idade).",
  },
  {
    icon: FileText,
    titulo: "Comprovante de residência",
    descricao: "Para confirmar os dados de cadastro.",
  },
];

const atendimento = [
  { dias: "Segundas e quintas-feiras", horario: "8h às 16h" },
  { dias: "Terças e quartas-feiras", horario: "13h às 21h" },
  { dias: "Sextas-feiras", horario: "7h às 15h" },
];

const passos = [
  {
    numero: "1",
    titulo: "Compareça à secretaria",
    descricao:
      "A inscrição é feita presencialmente, durante o horário de atendimento. Não é possível reservar vaga por telefone, WhatsApp ou pela internet.",
  },
  {
    numero: "2",
    titulo: "Verifique se há vaga disponível",
    descricao:
      "As turmas têm número limitado de alunos e a procura é grande. Novas vagas surgem aos poucos, principalmente quando algum aluno deixa de frequentar as aulas.",
  },
  {
    numero: "3",
    titulo: "Leve os documentos necessários",
    descricao:
      "Apresente o atestado médico e os documentos pessoais listados abaixo. Sem o atestado, a matrícula não pode ser confirmada.",
  },
  {
    numero: "4",
    titulo: "Confirme seus dados de contato",
    descricao:
      "Um telefone ou WhatsApp atualizado ajuda a equipe a avisar sobre faltas, trocas de horário e comunicados da turma.",
  },
];

function ComoSeInscreverPage() {
  return (
    <PublicLayout>
      <section className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="mb-8 space-y-3">
          <h1 className="font-display text-3xl font-semibold">Como se inscrever</h1>

          <p className="text-sm leading-relaxed text-muted-foreground">
            As inscrições para natação e hidroginástica são feitas presencialmente, na
            secretaria. Esta página explica como funciona o processo, o que levar e quando
            procurar a equipe.
          </p>
        </div>

        <Card className="mb-6 border-warning/40 bg-warning/10">
          <CardContent className="flex items-start gap-3 pt-6 text-sm">
            <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
            <p className="leading-relaxed text-foreground/85">
              <strong>As vagas são limitadas e a procura é alta.</strong> Não existe lista de
              espera ou pré-cadastro online: a forma mais segura de saber se há vaga é
              comparecer à secretaria durante o horário de atendimento.
            </p>
          </CardContent>
        </Card>

        <div className="mb-10 space-y-4">
          <h2 className="font-display text-xl font-semibold">Passo a passo</h2>

          {passos.map((p) => (
            <Card key={p.numero}>
              <CardContent className="flex gap-4 pt-6">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {p.numero}
                </span>

                <div>
                  <p className="font-medium text-foreground">{p.titulo}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {p.descricao}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-10">
          <h2 className="font-display text-xl font-semibold">Documentos necessários</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Leve os itens abaixo no dia da inscrição.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {documentos.map((d) => (
              <Card key={d.titulo} className="h-full">
                <CardHeader className="space-y-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <d.icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="text-base">{d.titulo}</CardTitle>
                  <CardDescription>{d.descricao}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="space-y-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <CalendarClock className="h-5 w-5" />
              </span>
              <CardTitle className="text-base">Horário de atendimento</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2 text-sm">
              {atendimento.map((a) => (
                <div key={a.dias} className="flex items-baseline justify-between gap-3">
                  <span className="text-foreground/85">{a.dias}</span>
                  <span className="shrink-0 font-medium text-foreground">{a.horario}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              <CardTitle className="text-base">Onde fica</CardTitle>
            </CardHeader>

            <CardContent className="space-y-1 text-sm text-foreground/85">
              <p>R. Dr. Barros Franco, S/N</p>
              <p>Pedro do Rio — Petrópolis, RJ</p>
              <p>CEP 25750-290</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-10 bg-secondary/50">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">Ainda tem dúvidas?</p>
                <p className="text-sm text-muted-foreground">
                  As dúvidas mais comuns são sobre disponibilidade de vagas e sobre faltas —
                  ambas são esclarecidas pessoalmente na secretaria.
                </p>
              </div>
            </div>

            <Link to="/avisos" className="shrink-0">
              <Button variant="outline">
                <Phone className="mr-2 h-4 w-4" />
                Ver avisos da secretaria
              </Button>
            </Link>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Esta página tem caráter informativo e não substitui o contato direto com a secretaria.
        </p>
      </section>
    </PublicLayout>
  );
}