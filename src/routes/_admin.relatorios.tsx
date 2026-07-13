import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import { supabase, buscarTodasLinhas } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  UserRound,
  Download,
  FileText,
  BarChart3,
  Users,
  DoorOpen,
  PersonStanding,
  HeartPulse,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Search,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios" }] }),
  component: Relatorios,
});

type Modalidade = "Natação Infantil" | "Natação Adulta" | "Hidroginástica";
type StatusPresenca = "presente" | "falta" | "falta justificada";

type Aluno = {
  id: string;
  nome_completo: string;
  nascimento: string | null;
  idade: number | null;
  modalidade: string | null;
  turma: string | null;
  responsavel: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string | null;
};

type Turma = {
  id: string;
  nome: string;
  modalidade: string;
  dia_semana: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  professor: string | null;
  vagas_total: number;
  ativa: boolean;
  criado_em: string | null;
};

type AlunoTurma = {
  id: string;
  aluno_id: string;
  turma_id: string;
  ativo: boolean;
};

type Chamada = {
  id: string;
  turma_id: string;
  data: string;
  observacoes: string | null;
  criado_em: string;
};

type Presenca = {
  id: string;
  chamada_id: string;
  aluno_id: string;
  turma_id: string;
  data: string;
  status: StatusPresenca;
  observacao: string | null;
  criado_em: string;
};

const modalidades: Modalidade[] = ["Natação Infantil", "Natação Adulta", "Hidroginástica"];

const LINHAS_INICIAIS = 10;

function nomeArquivo(base: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  return `${base}-${hoje}.csv`;
}

function downloadCSV(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Arquivo ${filename} exportado.`);
}

function exportarPDF() {
  toast.message("Abrindo impressão do relatório.", {
    description: 'Na janela de impressão, escolha "Salvar como PDF".',
  });
  window.print();
}

function formatarData(iso?: string | null) {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function formatarHorario(inicio?: string | null, fim?: string | null) {
  const i = inicio ? inicio.slice(0, 5) : null;
  const f = fim ? fim.slice(0, 5) : null;
  if (i && f) return `${i} às ${f}`;
  if (i) return i;
  return "Horário não informado";
}

function textoHorarioTurma(turma: Turma) {
  const dia = turma.dia_semana ? `${turma.dia_semana} — ` : "";
  return `${dia}${formatarHorario(turma.horario_inicio, turma.horario_fim)}`;
}

function isModalidade(valor: string | null | undefined): valor is Modalidade {
  return modalidades.includes(valor as Modalidade);
}

function valorDisponiveis(vagas: number, inscritos: number) {
  if (vagas <= 0) return "—";
  return Math.max(0, vagas - inscritos);
}

function mesAtualISO() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function Relatorios() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunosTurmas, setAlunosTurmas] = useState<AlunoTurma[]>([]);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [filtroPresencaTurma, setFiltroPresencaTurma] = useState("todos");
  const [verMaisPresenca, setVerMaisPresenca] = useState(false);

  const [filtroFaltasModalidade, setFiltroFaltasModalidade] = useState("todos");
  const [buscaFaltas, setBuscaFaltas] = useState("");
  const [verMaisFaltas, setVerMaisFaltas] = useState(false);

  async function carregarDados() {
    setCarregando(true);

    const [alunosRes, turmasRes, alunosTurmasRes, chamadasRes, presencasRes] = await Promise.all([
      buscarTodasLinhas<Aluno>(
        "alunos",
        "id, nome_completo, nascimento, idade, modalidade, turma, responsavel, telefone, whatsapp, email, observacoes, ativo, criado_em",
        { ordenarPor: "nome_completo", ascendente: true },
      ),
      supabase
        .from("turmas")
        .select(
          "id, nome, modalidade, dia_semana, horario_inicio, horario_fim, professor, vagas_total, ativa, criado_em",
        )
        .order("nome", { ascending: true }),
      buscarTodasLinhas<AlunoTurma>("alunos_turmas", "id, aluno_id, turma_id, ativo", {
        aplicarFiltros: (q) => q.eq("ativo", true),
      }),
      buscarTodasLinhas<Chamada>("chamadas", "id, turma_id, data, observacoes, criado_em", {
        ordenarPor: "data",
        ascendente: false,
      }),
      buscarTodasLinhas<Presenca>(
        "presencas",
        "id, chamada_id, aluno_id, turma_id, data, status, observacao, criado_em",
      ),
    ]);

    if (alunosRes.error) {
      toast.error(`Erro ao carregar alunos: ${alunosRes.error.message}`);
      setCarregando(false);
      return;
    }
    if (turmasRes.error) {
      toast.error(`Erro ao carregar turmas: ${turmasRes.error.message}`);
      setCarregando(false);
      return;
    }
    if (alunosTurmasRes.error) {
      toast.error(`Erro ao carregar vínculos: ${alunosTurmasRes.error.message}`);
      setCarregando(false);
      return;
    }
    if (chamadasRes.error) {
      toast.error(`Erro ao carregar chamadas: ${chamadasRes.error.message}`);
      setCarregando(false);
      return;
    }
    if (presencasRes.error) {
      toast.error(`Erro ao carregar presenças: ${presencasRes.error.message}`);
      setCarregando(false);
      return;
    }

    setAlunos((alunosRes.data ?? []) as Aluno[]);
    setTurmas((turmasRes.data ?? []) as Turma[]);
    setAlunosTurmas((alunosTurmasRes.data ?? []) as AlunoTurma[]);
    setChamadas((chamadasRes.data ?? []) as Chamada[]);
    setPresencas((presencasRes.data ?? []) as Presenca[]);
    setCarregando(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const relatorio = useMemo(() => {
    const alunosAtivos = alunos.filter((a) => a.ativo);
    const alunosAtivosIds = new Set(alunosAtivos.map((a) => a.id));
    const turmasAtivas = turmas.filter((t) => t.ativa);
    const vinculosAtivos = alunosTurmas.filter((v) => v.ativo && alunosAtivosIds.has(v.aluno_id));

    const vagasConfiguradasTotal = turmasAtivas.reduce((acc, t) => {
      return acc + Math.max(0, Number(t.vagas_total ?? 0));
    }, 0);

    const turmasComCapacidade = turmasAtivas.filter((t) => Number(t.vagas_total ?? 0) > 0).length;

    const porMod = modalidades.map((modalidade) => ({
      modalidade,
      total: alunosAtivos.filter((a) => a.modalidade === modalidade).length,
    }));

    const outrasModalidades = alunosAtivos.filter((a) => !isModalidade(a.modalidade)).length;

    const porTurma = turmasAtivas.map((turma) => {
      const inscritos = vinculosAtivos.filter((v) => v.turma_id === turma.id).length;
      const vagas = Number(turma.vagas_total ?? 0);
      const capacidadeConfigurada = vagas > 0;
      const disponiveis = capacidadeConfigurada ? Math.max(0, vagas - inscritos) : null;

      return {
        id: turma.id,
        turma: turma.nome,
        modalidade: turma.modalidade,
        horario: textoHorarioTurma(turma),
        professor: turma.professor || "—",
        inscritos,
        vagas,
        disponiveis,
        disponiveisTexto: valorDisponiveis(vagas, inscritos),
        capacidadeConfigurada,
        lotada: capacidadeConfigurada && inscritos >= vagas,
      };
    });

    const turmasLotadas = porTurma.filter((t) => t.lotada).length;
    const turmasMap = new Map(turmas.map((t) => [t.id, t]));

    const presencasPorChamada = new Map<string, Presenca[]>();
    presencas.forEach((p) => {
      const lista = presencasPorChamada.get(p.chamada_id) ?? [];
      lista.push(p);
      presencasPorChamada.set(p.chamada_id, lista);
    });

    const presPorPeriodo = chamadas.map((chamada) => {
      const turma = turmasMap.get(chamada.turma_id);
      const registros = presencasPorChamada.get(chamada.id) ?? [];
      const counts = registros.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1;
          return acc;
        },
        { presente: 0, falta: 0, "falta justificada": 0 } as Record<StatusPresenca, number>,
      );

      return {
        chamadaId: chamada.id,
        turmaId: chamada.turma_id,
        turma: turma?.nome ?? "Turma removida",
        modalidade: turma?.modalidade ?? "—",
        data: chamada.data,
        presentes: counts.presente,
        faltas: counts.falta,
        justificadas: counts["falta justificada"],
        total: registros.length,
      };
    });

    const presencasPorAluno = new Map<string, Presenca[]>();
    presencas.forEach((p) => {
      const lista = presencasPorAluno.get(p.aluno_id) ?? [];
      lista.push(p);
      presencasPorAluno.set(p.aluno_id, lista);
    });

    const faltasPorAluno = alunosAtivos
      .map((aluno) => {
        const registros = presencasPorAluno.get(aluno.id) ?? [];
        const faltas = registros.filter((r) => r.status === "falta").length;
        const justificadas = registros.filter((r) => r.status === "falta justificada").length;
        const presentes = registros.filter((r) => r.status === "presente").length;
        return {
          aluno: aluno.nome_completo,
          modalidade: aluno.modalidade || "—",
          turma: aluno.turma || "—",
          presentes,
          faltas,
          justificadas,
          total: registros.length,
        };
      })
      .filter((item) => item.faltas > 0 || item.justificadas > 0)
      .sort((a, b) => b.faltas - a.faltas);

    const mesAtual = mesAtualISO();
    const faltasNoMesPorAluno = new Map<string, number>();
    presencas.forEach((p) => {
      if (p.status === "falta" && p.data?.startsWith(mesAtual)) {
        faltasNoMesPorAluno.set(p.aluno_id, (faltasNoMesPorAluno.get(p.aluno_id) ?? 0) + 1);
      }
    });

    const alunosEmRisco = alunosAtivos
      .filter((a) => (faltasNoMesPorAluno.get(a.id) ?? 0) >= 3)
      .map((a) => ({
        id: a.id,
        nome: a.nome_completo,
        modalidade: a.modalidade || "—",
        turma: a.turma || "—",
        faltas: faltasNoMesPorAluno.get(a.id) ?? 0,
        critico: (faltasNoMesPorAluno.get(a.id) ?? 0) >= 4,
      }))
      .sort((a, b) => b.faltas - a.faltas);

    return {
      alunosAtivos,
      turmasAtivas,
      totalAlunos: alunos.length,
      totalAlunosAtivos: alunosAtivos.length,
      totalAlunosInativos: alunos.length - alunosAtivos.length,
      vagasConfiguradasTotal,
      turmasComCapacidade,
      turmasLotadas,
      porMod,
      outrasModalidades,
      porTurma,
      presPorPeriodo,
      faltasPorAluno,
      alunosEmRisco,
    };
  }, [alunos, turmas, alunosTurmas, chamadas, presencas]);

  const turmasUnicas = useMemo(() => {
    const nomes = [...new Set(relatorio.presPorPeriodo.map((p) => p.turma))].sort();
    return nomes;
  }, [relatorio.presPorPeriodo]);

  const presencaFiltrada = useMemo(() => {
    return relatorio.presPorPeriodo.filter((p) => {
      if (filtroPresencaTurma !== "todos" && p.turma !== filtroPresencaTurma) return false;
      return true;
    });
  }, [relatorio.presPorPeriodo, filtroPresencaTurma]);

  const presencaExibida = verMaisPresenca
    ? presencaFiltrada
    : presencaFiltrada.slice(0, LINHAS_INICIAIS);

  const faltasFiltradas = useMemo(() => {
    return relatorio.faltasPorAluno.filter((item) => {
      if (filtroFaltasModalidade !== "todos" && item.modalidade !== filtroFaltasModalidade)
        return false;
      if (buscaFaltas.trim() && !item.aluno.toLowerCase().includes(buscaFaltas.toLowerCase()))
        return false;
      return true;
    });
  }, [relatorio.faltasPorAluno, filtroFaltasModalidade, buscaFaltas]);

  const faltasExibidas = verMaisFaltas
    ? faltasFiltradas
    : faltasFiltradas.slice(0, LINHAS_INICIAIS);

  return (
    <div className="print-report-root space-y-6">
      <PrintStyles />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Relatórios</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe alunos, turmas, presença e dados administrativos do centro.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={carregarDados}
          disabled={carregando}
          className="no-print"
        >
          {carregando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          title="Alunos ativos"
          value={relatorio.totalAlunosAtivos}
          description={`${relatorio.totalAlunos} cadastrados no total`}
          icon={Users}
        />
        <ResumoCard
          title="Alunos inativos"
          value={relatorio.totalAlunosInativos}
          description="Registros mantidos no sistema"
          icon={Users}
        />
        <ResumoCard
          title="Turmas ativas"
          value={relatorio.turmasAtivas.length}
          description="Turmas disponíveis no sistema"
          icon={BarChart3}
        />
        <ResumoCard
          title="Turmas lotadas"
          value={relatorio.turmasLotadas}
          description={
            relatorio.turmasComCapacidade === 0
              ? "Aguardando configuração de vagas"
              : "Turmas sem vagas restantes"
          }
          icon={DoorOpen}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ResumoCard
          title="Capacidade definida"
          value={relatorio.turmasComCapacidade}
          description={`${relatorio.vagasConfiguradasTotal} vaga(s) configurada(s)`}
          icon={DoorOpen}
        />
        <ResumoCard
          title="Chamadas salvas"
          value={chamadas.length}
          description="Registros de presença lançados"
          icon={BarChart3}
        />
      </div>

      {(relatorio.alunosEmRisco.length > 0 || carregando) && (
        <Card className="print-card border-destructive/40 bg-destructive/5">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <CardTitle className="text-base text-destructive">
                  Alunos em risco de cancelamento
                </CardTitle>
                <CardDescription>
                  Alunos com 3 ou mais faltas sem justificativa no mês atual. A partir de 4 faltas,
                  a vaga é cancelada automaticamente.
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="no-print shrink-0"
              onClick={() =>
                downloadCSV(nomeArquivo("alunos-em-risco"), [
                  ["Aluno", "Modalidade", "Turma", "Faltas no mês"],
                  ...relatorio.alunosEmRisco.map((item) => [
                    item.nome,
                    item.modalidade,
                    item.turma,
                    item.faltas,
                  ]),
                ])
              }
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <LoadingLine />
            ) : relatorio.alunosEmRisco.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aluno em risco no mês atual.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead className="text-right">Faltas no mês</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.alunosEmRisco.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.nome}</p>
                        <p className="text-xs text-muted-foreground">{item.modalidade}</p>
                      </TableCell>
                      <TableCell>{item.turma}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.critico ? "destructive" : "outline"}>
                          {item.faltas} {item.critico ? "(desligado)" : "(alerta)"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <ReportCard
        title="Distribuição por modalidade"
        description="Resumo de alunos ativos cadastrados em cada atividade."
        onCSV={() =>
          downloadCSV(nomeArquivo("alunos-por-modalidade"), [
            ["Modalidade", "Total"],
            ...relatorio.porMod.map((item) => [item.modalidade, item.total]),
            ["Outras/sem modalidade", relatorio.outrasModalidades],
          ])
        }
      >
        {carregando ? (
          <LoadingLine />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {relatorio.porMod.map((item) => (
              <ModalidadeResumo
                key={item.modalidade}
                modalidade={item.modalidade}
                total={item.total}
              />
            ))}
          </div>
        )}
      </ReportCard>

      <ReportCard
        title="Alunos e capacidade por turma"
        description="Relação das turmas ativas, alunos vinculados e capacidade configurada."
        onCSV={() =>
          downloadCSV(nomeArquivo("alunos-por-turma"), [
            [
              "Turma",
              "Modalidade",
              "Horário",
              "Professor",
              "Inscritos",
              "Capacidade",
              "Disponíveis",
              "Situação",
            ],
            ...relatorio.porTurma.map((item) => [
              item.turma,
              item.modalidade,
              item.horario,
              item.professor,
              item.inscritos,
              item.capacidadeConfigurada ? item.vagas : "Não configurada",
              item.capacidadeConfigurada ? (item.disponiveis ?? 0) : "—",
              item.capacidadeConfigurada
                ? item.lotada
                  ? "Lotada"
                  : "Com vagas"
                : "Capacidade não configurada",
            ]),
          ])
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Turma</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead className="text-right">Inscritos</TableHead>
              <TableHead className="text-right">Capacidade</TableHead>
              <TableHead className="text-right">Disponíveis</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Carregando relatório...
                </TableCell>
              </TableRow>
            )}
            {!carregando && relatorio.porTurma.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma turma ativa encontrada.
                </TableCell>
              </TableRow>
            )}
            {!carregando &&
              relatorio.porTurma.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.turma}</TableCell>
                  <TableCell>{item.modalidade}</TableCell>
                  <TableCell className="text-muted-foreground">{item.horario}</TableCell>
                  <TableCell>{item.professor}</TableCell>
                  <TableCell className="text-right">{item.inscritos}</TableCell>
                  <TableCell className="text-right">
                    {item.capacidadeConfigurada ? (
                      item.vagas
                    ) : (
                      <span className="text-muted-foreground">Não configurada</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">
                      {item.capacidadeConfigurada ? item.disponiveis : "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!item.capacidadeConfigurada ? (
                      <Badge variant="outline">A configurar</Badge>
                    ) : item.lotada ? (
                      <Badge variant="destructive">Lotada</Badge>
                    ) : (
                      <Badge variant="outline">Com vagas</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </ReportCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportCard
          title="Presença por período"
          description="Chamadas registradas por turma e data."
          onCSV={() =>
            downloadCSV(nomeArquivo("presencas-por-periodo"), [
              ["Turma", "Modalidade", "Data", "Total", "Presentes", "Faltas", "Justificadas"],
              ...presencaFiltrada.map((item) => [
                item.turma,
                item.modalidade,
                formatarData(item.data),
                item.total,
                item.presentes,
                item.faltas,
                item.justificadas,
              ]),
            ])
          }
        >
          <div className="mb-3 no-print">
            <select
              value={filtroPresencaTurma}
              onChange={(e) => {
                setFiltroPresencaTurma(e.target.value);
                setVerMaisPresenca(false);
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="todos">Todas as turmas</option>
              {turmasUnicas.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Turma</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Presentes</TableHead>
                <TableHead className="text-right">Faltas</TableHead>
                <TableHead className="text-right">Justif.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Carregando presenças...
                  </TableCell>
                </TableRow>
              )}
              {!carregando && presencaFiltrada.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma presença registrada ainda.
                  </TableCell>
                </TableRow>
              )}
              {!carregando &&
                presencaExibida.map((item) => (
                  <TableRow key={item.chamadaId}>
                    <TableCell className="text-sm">
                      <p className="font-medium">{item.turma}</p>
                      <p className="text-xs text-muted-foreground">{item.modalidade}</p>
                    </TableCell>
                    <TableCell>{formatarData(item.data)}</TableCell>
                    <TableCell className="text-right">{item.total}</TableCell>
                    <TableCell className="text-right">{item.presentes}</TableCell>
                    <TableCell className="text-right">{item.faltas}</TableCell>
                    <TableCell className="text-right">{item.justificadas}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {!carregando && presencaFiltrada.length > LINHAS_INICIAIS && (
            <div className="mt-2 border-t border-border/50 pt-2 no-print">
              <button
                type="button"
                onClick={() => setVerMaisPresenca((v) => !v)}
                className="flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${verMaisPresenca ? "rotate-180" : ""}`}
                />
                {verMaisPresenca
                  ? "Ver menos"
                  : `Ver mais ${presencaFiltrada.length - LINHAS_INICIAIS} registros`}
              </button>
            </div>
          )}
          {!carregando && (
            <p className="mt-1 text-xs text-muted-foreground">
              {presencaExibida.length} de {presencaFiltrada.length} registros exibidos
            </p>
          )}
        </ReportCard>

        <ReportCard
          title="Faltas por aluno"
          description="Alunos com faltas ou faltas justificadas registradas."
          onCSV={() =>
            downloadCSV(nomeArquivo("faltas-por-aluno"), [
              [
                "Aluno",
                "Modalidade",
                "Turma",
                "Presentes",
                "Faltas",
                "Justificadas",
                "Total de registros",
              ],
              ...faltasFiltradas.map((item) => [
                item.aluno,
                item.modalidade,
                item.turma,
                item.presentes,
                item.faltas,
                item.justificadas,
                item.total,
              ]),
            ])
          }
        >
          <div className="mb-3 flex flex-col gap-2 no-print sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={buscaFaltas}
                onChange={(e) => {
                  setBuscaFaltas(e.target.value);
                  setVerMaisFaltas(false);
                }}
                placeholder="Buscar aluno..."
                className="pl-8 text-sm h-9"
              />
            </div>
            <select
              value={filtroFaltasModalidade}
              onChange={(e) => {
                setFiltroFaltasModalidade(e.target.value);
                setVerMaisFaltas(false);
              }}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="todos">Todas as modalidades</option>
              {modalidades.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead className="text-right">Presentes</TableHead>
                <TableHead className="text-right">Faltas</TableHead>
                <TableHead className="text-right">Justif.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Carregando faltas...
                  </TableCell>
                </TableRow>
              )}
              {!carregando && faltasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    {buscaFaltas || filtroFaltasModalidade !== "todos"
                      ? "Nenhum resultado para os filtros aplicados."
                      : "Nenhuma falta registrada ainda."}
                  </TableCell>
                </TableRow>
              )}
              {!carregando &&
                faltasExibidas.map((item) => (
                  <TableRow key={`${item.aluno}-${item.turma}`}>
                    <TableCell>
                      <p className="font-medium">{item.aluno}</p>
                      <p className="text-xs text-muted-foreground">{item.modalidade}</p>
                    </TableCell>
                    <TableCell>{item.turma}</TableCell>
                    <TableCell className="text-right">{item.presentes}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.faltas > 0 ? "destructive" : "outline"}>
                        {item.faltas}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{item.justificadas}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {!carregando && faltasFiltradas.length > LINHAS_INICIAIS && (
            <div className="mt-2 border-t border-border/50 pt-2 no-print">
              <button
                type="button"
                onClick={() => setVerMaisFaltas((v) => !v)}
                className="flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${verMaisFaltas ? "rotate-180" : ""}`}
                />
                {verMaisFaltas
                  ? "Ver menos"
                  : `Ver mais ${faltasFiltradas.length - LINHAS_INICIAIS} alunos`}
              </button>
            </div>
          )}
          {!carregando && (
            <p className="mt-1 text-xs text-muted-foreground">
              {faltasExibidas.length} de {faltasFiltradas.length} alunos exibidos
            </p>
          )}
        </ReportCard>
      </div>
    </div>
  );
}

function PrintStyles() {
  return (
    <style>
      {`
        @media print {
          @page { margin: 12mm; }
          html, body { background: #ffffff !important; }
          .no-print { display: none !important; }
          .print-report-root { color: #111827 !important; background: #ffffff !important; }
          .print-report-root .print-card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; border: 1px solid #d1d5db !important; background: #ffffff !important; }
          .print-report-root table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .print-report-root th, .print-report-root td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; }
          .print-report-root h2 { font-size: 20px; margin-bottom: 4px; }
          .print-report-root p { color: #374151 !important; }
          .print-report-root span, .print-report-root div, .print-report-root td, .print-report-root th { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}
    </style>
  );
}

function LoadingLine() {
  return (
    <div className="flex items-center justify-center rounded-md border border-dashed border-border p-8 text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Carregando relatório...
    </div>
  );
}

function ResumoCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="print-card">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function AdultSwimmingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="6.5" r="2.2" />
      <path d="M8.3 14.4c.9-2.1 2.2-3.2 3.7-3.2s2.8 1.1 3.7 3.2" />
      <path d="M4 17.2c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
      <path d="M5 20c1.3 0 1.3-.8 2.6-.8s1.3.8 2.6.8 1.3-.8 2.6-.8 1.3.8 2.6.8 1.3-.8 2.6-.8 1.3.8 2.6.8" />
    </svg>
  );
}

function ModalidadeResumo({ modalidade, total }: { modalidade: Modalidade; total: number }) {
  const config: Record<
    Modalidade,
    { icon: ComponentType<{ className?: string }>; descricao: string; className: string }
  > = {
    "Natação Infantil": {
      icon: PersonStanding,
      descricao: "7 a 17 anos",
      className: "bg-accent text-accent-foreground",
    },
    "Natação Adulta": {
      icon: UserRound,
      descricao: "18 anos ou mais",
      className: "bg-accent text-accent-foreground",
    },
    Hidroginástica: {
      icon: HeartPulse,
      descricao: "18 anos ou mais",
      className: "bg-accent text-accent-foreground",
    },
  };

  const Icon = config[modalidade].icon;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${config[modalidade].className}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-medium text-foreground">{modalidade}</p>
          <p className="text-xs text-muted-foreground">{config[modalidade].descricao}</p>
        </div>
      </div>
      <p className="text-2xl font-semibold text-foreground">{total}</p>
    </div>
  );
}

function ReportCard({
  title,
  description,
  children,
  onCSV,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onCSV: () => void;
}) {
  return (
    <Card className="print-card">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        <div className="no-print flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={onCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportarPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Imprimir/PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">{children}</CardContent>
    </Card>
  );
}
