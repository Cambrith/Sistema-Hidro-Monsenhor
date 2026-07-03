import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/portal/ajuda")({
  head: () => ({ meta: [{ title: "Dúvidas – Portal do Aluno" }] }),
  component: PortalAjuda,
});

const regras = [
  {
    icon: AlertTriangle,
    titulo: "Faltas",
    texto:
      "4 ou mais faltas sem justificativa no mês anulam a vaga. Até 3 faltas não justificadas ainda mantém você ativo.",
  },
  {
    icon: FileText,
    titulo: "Atestado médico e PAR-Q",
    texto:
      "Ambos devem ser renovados anualmente, no 1º dia letivo do ano. Envie pelo portal na aba Documentos.",
  },
  {
    icon: ShieldCheck,
    titulo: "Uniforme",
    texto: "Touca azul-marinho ou preta. Sunga ou maiô da mesma cor.",
  },
  {
    icon: Clock,
    titulo: "Tolerância de atraso",
    texto: "5 minutos após o horário de início da aula.",
  },
  {
    icon: RefreshCw,
    titulo: "Troca de turma",
    texto:
      "Pode ser solicitada à secretaria. Fale pelos canais de contato para verificar disponibilidade.",
  },
];

const faq = [
  {
    pergunta: "Quantas faltas posso ter sem perder a vaga?",
    resposta:
      "Até 3 faltas sem justificativa no mês. A partir da 4ª falta sem justificativa, a vaga é anulada.",
  },
  {
    pergunta: "Meu atestado ou PAR-Q venceu. O que eu faço?",
    resposta:
      "Envie o documento atualizado pelo portal, na aba Documentos. A secretaria confere e atualiza sua validade.",
  },
  {
    pergunta: "Posso participar de mais de uma modalidade ou turma?",
    resposta: "Não. Cada aluno pode estar em apenas uma modalidade e uma turma por vez.",
  },
  {
    pergunta: "Como faço para trocar de turma ou horário?",
    resposta:
      "Fale com a secretaria pelos canais de contato abaixo. A disponibilidade de vagas em outros horários é limitada.",
  },
  {
    pergunta: "Tenho uma falta justificada. Preciso levar comprovante?",
    resposta:
      "Sim, procure a secretaria com o comprovante (atestado, declaração etc.) para que a falta seja registrada como justificada.",
  },
];

function PortalAjuda() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div>
        <h1 className="text-xl font-semibold">Dúvidas e Regras</h1>
        <p className="text-sm text-muted-foreground">
          Principais regras do centro esportivo e respostas para as dúvidas mais comuns.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Regulamento resumido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {regras.map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.titulo}
                  className="flex items-start gap-3 rounded-lg border border-border bg-accent/20 p-3"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{r.titulo}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{r.texto}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4 text-primary" />
            Perguntas frequentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {faq.map((f) => (
            <div
              key={f.pergunta}
              className="border-t border-border pt-4 first:border-t-0 first:pt-0"
            >
              <p className="text-sm font-medium">{f.pergunta}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.resposta}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Não encontrou o que precisava?</p>
        <p className="mt-1">
          Acesse os canais oficiais do centro para falar diretamente com a secretaria.
        </p>
        <Link
          to="/"
          hash="canais-oficiais"
          className="mt-2 inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
        >
          Ver canais de contato
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}