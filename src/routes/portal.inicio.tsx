import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessaoAluno } from "@/lib/auth-aluno";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarDays, CheckCircle2, FileText, Phone, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/inicio")({
  head: () => ({ meta: [{ title: "Início — Portal do Aluno" }] }),
  component: PortalInicio,
});

type DadosAluno = {
  id: string;
  nome_completo: string;
  modalidade: string;
  turma: string | null;
  atestado_validade: string | null;
  ativo: boolean;
};

type Presenca = {
  id: string;
  data: string;
  status: "presente" | "falta" | "falta justificada";
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

function atestadoStatus(validade?: string | null) {
  if (!validade) return "ausente";
  const diff = (new Date(validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "vencido";
  if (diff <= 30) return "vencendo";
  return "ok";
}

function InfoSecretaria() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-accent/20 px-4 py-3 text-xs text-muted-foreground">
      <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Dúvidas? Ligue para a secretaria:{" "}
        <a href="tel:+552422452089" className="font-medium text-foreground hover:underline">
          (24) 2245-2089
        </a>
        {" "}· Seg 08h–16h · Ter e Qua 13h–21h · Qui 08h–16h · Sex 07h–15h.
        Se preferir, compareça presencialmente.
      </span>
    </div>
  );
}

function PortalInicio() {
  const sessao = getSessaoAluno();
  const [aluno, setAluno] = useState<DadosAluno | null>(null);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { if (sessao) carregarDados(); }, []);

  async function carregarDados() {
    if (!sessao) return;
    setCarregando(true);
    const { data, error } = await supabase
      .from("alunos")
      .select("id, nome_completo, modalidade, turma, atestado_validade, ativo")
      .eq("id", sessao.id)
      .maybeSingle();
    if (error || !data) { toast.error("Erro ao carregar seus dados."); setCarregando(false); return; }
    setAluno(data as DadosAluno);
    const { inicio, fim } = mesAtual();
    const { data: dp } = await supabase
      .from("presencas").select("id, data, status")
      .eq("aluno_id", sessao.id).gte("data", inicio).lte("data", fim)
      .order("data", { ascending: false });
    setPresencas((dp ?? []) as Presenca[]);
    setCarregando(false);
  }

  if (carregando) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (!aluno) return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Não foi possível carregar seus dados.</p>
        <Button className="mt-4" onClick={carregarDados}>Tentar novamente</Button>
      </div>
    </div>
  );

  const { label: mesLabel } = mesAtual();
  const totalFaltas = presencas.filter((p) => p.status === "falta").length;
  const faltasJustificadas = presencas.filter((p) => p.status === "falta justificada").length;
  const totalPresentes = presencas.filter((p) => p.status === "presente").length;
  const statusAtestado = atestadoStatus(aluno.atestado_validade);
  const primeiroNome = aluno.nome_completo.split(" ")[0];

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6">

      {/* Saudação */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-accent/20 px-4 py-3">
        <div>
          <p className="font-semibold">Olá, {primeiroNome}!</p>
          <p className="text-sm text-muted-foreground">
            {aluno.modalidade}{aluno.turma ? ` · ${aluno.turma}` : ""}
          </p>
        </div>
        <Badge className={aluno.ativo
          ? "border border-green-300 bg-green-50 text-green-700"
          : "border border-muted bg-muted text-muted-foreground"}>
          {aluno.ativo ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      {/* Alerta atestado */}
      {statusAtestado !== "ok" && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
          statusAtestado === "vencendo"
            ? "border-yellow-300 bg-yellow-50 text-yellow-700"
            : "border-red-300 bg-red-50 text-red-700"
        }`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p>
              {statusAtestado === "ausente" && "Seu atestado médico não está cadastrado."}
              {statusAtestado === "vencido" && `Seu atestado venceu em ${formatarData(aluno.atestado_validade)}.`}
              {statusAtestado === "vencendo" && `Seu atestado vence em ${formatarData(aluno.atestado_validade)}.`}
            </p>
            <p>
              Envie pelo portal na aba{" "}
              <Link to="/portal/documentos" className="font-medium underline underline-offset-2">
                Documentos
              </Link>
              {" "}ou ligue para a secretaria:{" "}
              <a href="tel:+552422452089" className="font-medium underline underline-offset-2">
                (24) 2245-2089
              </a>
              .
            </p>
          </div>
        </div>
      )}

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
            <div className={`rounded-lg border p-3 text-center ${
              totalFaltas >= 4 ? "border-red-300 bg-red-50"
              : totalFaltas >= 2 ? "border-yellow-200 bg-yellow-50"
              : "border-border bg-accent/20"
            }`}>
              <p className={`text-2xl font-bold ${
                totalFaltas >= 4 ? "text-red-700"
                : totalFaltas >= 2 ? "text-yellow-700"
                : "text-foreground"
              }`}>{totalFaltas}</p>
              <p className={`mt-0.5 text-xs ${
                totalFaltas >= 4 ? "text-red-600"
                : totalFaltas >= 2 ? "text-yellow-600"
                : "text-muted-foreground"
              }`}>Faltas</p>
            </div>
            <div className="rounded-lg border border-border bg-accent/20 p-3 text-center">
              <p className="text-2xl font-bold">{faltasJustificadas}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Justificadas</p>
            </div>
          </div>

          {totalFaltas >= 4 && (
            <p className="mt-3 text-xs font-medium text-red-600">
              ⚠ Você atingiu o limite de faltas. Ligue para a secretaria:{" "}
              <a href="tel:+552422452089" className="underline">(24) 2245-2089</a>.
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
                <div key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{formatarData(p.data)}</span>
                  <span className={`flex items-center gap-1.5 font-medium ${
                    p.status === "presente" ? "text-green-700"
                    : p.status === "falta justificada" ? "text-yellow-700"
                    : "text-red-700"
                  }`}>
                    {p.status === "presente"
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : <XCircle className="h-3.5 w-3.5" />}
                    {p.status === "presente" ? "Presente"
                      : p.status === "falta justificada" ? "Justificada"
                      : "Falta"}
                  </span>
                </div>
              ))}
              {presencas.length > 5 && (
                <Link to="/portal/presencas" className="block pt-1 text-center text-xs font-medium text-primary hover:underline">
                  Ver todas as presenças →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Atestado resumido */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Atestado médico
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Validade</span>
            <span className={`font-medium ${
              statusAtestado === "ok" ? "text-green-700"
              : statusAtestado === "vencendo" ? "text-yellow-700"
              : "text-red-700"
            }`}>
              {aluno.atestado_validade ? formatarData(aluno.atestado_validade) : "Não cadastrado"}
            </span>
          </div>
          <Link to="/portal/documentos" className="mt-3 block text-xs font-medium text-primary hover:underline">
            Ver detalhes e enviar documentos →
          </Link>
        </CardContent>
      </Card>

      {/* Secretaria */}
      <InfoSecretaria />
    </div>
  );
}