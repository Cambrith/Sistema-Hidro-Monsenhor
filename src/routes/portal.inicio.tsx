import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabaseAluno } from "@/lib/supabase";
import { getSessaoAluno, sairAluno, type SessaoAluno } from "@/lib/auth-aluno";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { statusValidade } from "@/lib/validade";
export const Route = createFileRoute("/portal/inicio")({
  beforeLoad: async () => {
    if (!(await getSessaoAluno())) throw redirect({ to: "/portal" });
  },
  head: () => ({ meta: [{ title: "Início — Portal do Aluno" }] }),
  component: PortalInicio,
});

type DadosAluno = {
  id: string;
  nome_completo: string;
  modalidade: string;
  turma: string | null;
  atestado_validade: string | null;
  parq_validade: string | null;
  ativo: boolean;
};

type Presenca = {
  id: string;
  data: string;
  status: "presente" | "falta" | "falta justificada";
};

type TurmaInfo = {
  nome: string;
  modalidade: string;
  dia_semana: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  professor: string | null;
};

function formatarData(data?: string | null) {
  if (!data) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return "—";
}

function mesAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const label = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return { inicio: `${ano}-${mes}-01`, fim: `${ano}-${mes}-31`, label };
}

function PortalInicio() {
  const [sessao, setSessao] = useState<SessaoAluno | null>(null);
  const navigate = useNavigate();
  const [aluno, setAluno] = useState<DadosAluno | null>(null);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [turmaInfo, setTurmaInfo] = useState<TurmaInfo | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    getSessaoAluno().then(setSessao);
  }, []);
  useEffect(() => {
    if (sessao) carregarDados();
  }, [sessao]);

  async function carregarDados() {
    if (!sessao) return;
    setCarregando(true);

    const { data, error } = await supabaseAluno.rpc("portal_dados_inicio", {
      p_aluno_id: sessao.id,
    });
    const alunoData = data?.[0];

    if (error) {
      toast.error("Erro ao carregar seus dados.");
      setCarregando(false);
      return;
    }

    // Sucesso mas sem linha = sessão com um id que não existe mais no banco
    // (ex: cadastro foi apagado/recriado). Desloga em vez de travar na tela de erro.
    if (!alunoData) {
      toast.error("Sua sessão expirou. Faça login novamente.");
      sairAluno();
      navigate({ to: "/portal" });
      return;
    }

    setAluno(alunoData as DadosAluno);

    const { inicio, fim } = mesAtual();
    const { data: dp } = await supabaseAluno.rpc("portal_presencas_mes", {
      p_aluno_id: sessao.id,
      p_inicio: inicio,
      p_fim: fim,
    });
    setPresencas((dp ?? []) as Presenca[]);

    const { data: dt } = await supabaseAluno.rpc("portal_turma_atual", {
      p_aluno_id: sessao.id,
    });
    setTurmaInfo((dt?.[0] ?? null) as TurmaInfo | null);

    setCarregando(false);
  }

  if (carregando)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );

  if (!aluno)
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar seus dados.</p>
          <Button className="mt-4" onClick={carregarDados}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );

  const { label: mesLabel } = mesAtual();
  const totalFaltas = presencas.filter((p) => p.status === "falta").length;
  const faltasJustificadas = presencas.filter((p) => p.status === "falta justificada").length;
  const totalPresentes = presencas.filter((p) => p.status === "presente").length;
  const statusAtestado = statusValidade(aluno.atestado_validade);
  const statusParq = statusValidade(aluno.parq_validade);
  const primeiroNome = aluno.nome_completo.split(" ")[0];

  // Vencido, vencendo ou ausente geram alerta (atestado e PAR-Q).
  // "ausente"/"vencido" são graves (vermelho); "vencendo" é atenção (amarelo).
  const atestadoProblema = statusAtestado !== "ok";
  const parqProblema = statusParq !== "ok";
  const mostrarAlerta = atestadoProblema || parqProblema;

  const pendencias: string[] = [];
  if (statusAtestado === "ausente") pendencias.push("Atestado médico não cadastrado.");
  if (statusAtestado === "vencido")
    pendencias.push(`Atestado médico venceu em ${formatarData(aluno.atestado_validade)}.`);
  if (statusAtestado === "vencendo")
    pendencias.push(`Atestado médico vence em ${formatarData(aluno.atestado_validade)}.`);
  if (statusParq === "ausente") pendencias.push("PAR-Q não cadastrado.");
  if (statusParq === "vencido")
    pendencias.push(`PAR-Q venceu em ${formatarData(aluno.parq_validade)}.`);
  if (statusParq === "vencendo")
    pendencias.push(`PAR-Q vence em ${formatarData(aluno.parq_validade)}.`);

  const grave =
    statusAtestado === "vencido" ||
    statusAtestado === "ausente" ||
    statusParq === "vencido" ||
    statusParq === "ausente";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      {/* Saudação */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-accent/20 px-4 py-3">
        <div>
          <p className="font-semibold">Olá, {primeiroNome}!</p>
          <p className="text-sm text-muted-foreground">
            {aluno.modalidade}
            {aluno.turma ? ` · ${aluno.turma}` : ""}
          </p>
        </div>
        <Badge
          className={
            aluno.ativo
              ? "border border-green-300 bg-green-50 text-green-700"
              : "border border-muted bg-muted text-muted-foreground"
          }
        >
          {aluno.ativo ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      {/* Alerta documentos */}
      {mostrarAlerta && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            grave
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-yellow-300 bg-yellow-50 text-yellow-700"
          }`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1.5">
            <ul className="space-y-0.5">
              {pendencias.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
            <p>
              Envie pelo portal na aba{" "}
              <Link to="/portal/documentos" className="font-medium underline underline-offset-2">
                Documentos
              </Link>{" "}
              ou acesse os{" "}
              <Link
                to="/"
                hash="canais-oficiais"
                className="font-medium underline underline-offset-2"
              >
                canais de contato
              </Link>{" "}
              para contatar a secretaria.
            </p>
          </div>
        </div>
      )}

      {/* Minha Turma */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Minha Turma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {turmaInfo ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Turma</span>
                <span className="font-medium">{turmaInfo.nome}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-muted-foreground">Dia</span>
                <span className="font-medium">{turmaInfo.dia_semana || "—"}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-muted-foreground">Horário</span>
                <span className="font-medium">
                  {turmaInfo.horario_inicio && turmaInfo.horario_fim
                    ? `${turmaInfo.horario_inicio.slice(0, 5)} às ${turmaInfo.horario_fim.slice(0, 5)}`
                    : "—"}
                </span>
              </div>
              {turmaInfo.professor && (
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Professor(a)</span>
                  <span className="font-medium">{turmaInfo.professor}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você ainda não está vinculado a uma turma. Fale com a secretaria pelos{" "}
              <Link
                to="/"
                hash="canais-oficiais"
                className="font-medium text-primary underline underline-offset-2"
              >
                canais de contato
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      {/* Frequência */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            Frequência — {mesLabel}
          </CardTitle>
          <CardDescription>
            Regra: 4 ou mais faltas sem justificativa anulam a vaga.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-accent/20 p-3 text-center">
              <p className="text-2xl font-bold">{totalPresentes}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Presenças</p>
            </div>
            <div
              className={`rounded-lg border p-3 text-center ${
                totalFaltas >= 4
                  ? "border-red-300 bg-red-50"
                  : totalFaltas >= 2
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-border bg-accent/20"
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  totalFaltas >= 4
                    ? "text-red-700"
                    : totalFaltas >= 2
                      ? "text-yellow-700"
                      : "text-foreground"
                }`}
              >
                {totalFaltas}
              </p>
              <p
                className={`mt-0.5 text-xs ${
                  totalFaltas >= 4
                    ? "text-red-600"
                    : totalFaltas >= 2
                      ? "text-yellow-600"
                      : "text-muted-foreground"
                }`}
              >
                Faltas
              </p>
            </div>
            <div className="rounded-lg border border-border bg-accent/20 p-3 text-center">
              <p className="text-2xl font-bold">{faltasJustificadas}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Justificadas</p>
            </div>
          </div>

          {totalFaltas >= 4 && (
            <p className="mt-3 text-xs font-medium text-red-600">
              ⚠ Você atingiu o limite de faltas. Ligue para a secretaria:{" "}
              <a href="tel:+552422452089" className="underline">
                (24) 2245-2089
              </a>
              .
            </p>
          )}

          {presencas.length === 0 && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Nenhuma aula registrada neste mês ainda.
            </p>
          )}

          {presencas.length > 0 && (
            <div className="mt-4 space-y-2">
              {presencas.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{formatarData(p.data)}</span>
                  <span
                    className={`flex items-center gap-1.5 font-medium ${
                      p.status === "presente"
                        ? "text-green-700"
                        : p.status === "falta justificada"
                          ? "text-yellow-700"
                          : "text-red-700"
                    }`}
                  >
                    {p.status === "presente" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {p.status === "presente"
                      ? "Presente"
                      : p.status === "falta justificada"
                        ? "Justificada"
                        : "Falta"}
                  </span>
                </div>
              ))}
              {presencas.length > 5 && (
                <Link
                  to="/portal/presencas"
                  className="block pt-1 text-center text-xs font-medium text-primary hover:underline"
                >
                  Ver todas as presenças →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentos resumido */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Documentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Atestado médico</span>
            <span
              className={`font-medium ${
                statusAtestado === "ok"
                  ? "text-green-700"
                  : statusAtestado === "vencendo"
                    ? "text-yellow-700"
                    : "text-red-700"
              }`}
            >
              {aluno.atestado_validade ? formatarData(aluno.atestado_validade) : "Não cadastrado"}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-muted-foreground">PAR-Q</span>
            <span
              className={`font-medium ${
                statusParq === "ok"
                  ? "text-green-700"
                  : statusParq === "vencendo"
                    ? "text-yellow-700"
                    : "text-red-700"
              }`}
            >
              {aluno.parq_validade ? formatarData(aluno.parq_validade) : "Não cadastrado"}
            </span>
          </div>
          <Link
            to="/portal/documentos"
            className="block pt-1 text-xs font-medium text-primary hover:underline"
          >
            Ver detalhes e enviar documentos →
          </Link>
        </CardContent>
      </Card>

      {/* Canais de contato */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Precisa de ajuda?</p>
        <p className="mt-1">
          Acesse os canais oficiais do centro para falar com a secretaria, tirar dúvidas ou
          acompanhar novidades.
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
