import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Download,
  FileText,
  BarChart3,
  Users,
  ClipboardList,
  Hourglass,
  DoorOpen,
  Baby,
  HeartPulse,
  RefreshCw,
  Loader2,
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

type PreCadastro = {
  id: string;
  status: string;
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

const modalidades: Modalidade[] = [
  "Natação Infantil",
  "Natação Adulta",
  "Hidroginástica",
];

function nomeArquivo(base: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  return `${base}-${hoje}.csv`;
}

function downloadCSV(
  filename: string,
  rows: Array<Array<string | number | null | undefined>>,
) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(";"),
    )
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
    description: "Na janela de impressão, escolha “Salvar como PDF”.",
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

function Relatorios() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [preCadastros, setPreCadastros] = useState<PreCadastro[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunosTurmas, setAlunosTurmas] = useState<AlunoTurma[]>([]);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregarDados() {
    setCarregando(true);

    const [
      alunosRes,
      preCadastrosRes,
      turmasRes,
      alunosTurmasRes,
      chamadasRes,
      presencasRes,
    ] = await Promise.all([
      supabase
        .from("alunos")
        .select(
          "id, nome_completo, nascimento, idade, modalidade, turma, responsavel, telefone, whatsapp, email, observacoes, ativo, criado_em",
        )
        .order("nome_completo", { ascending: true }),

      supabase.from("pre_cadastros").select("id, status"),

      supabase
        .from("turmas")
        .select(
          "id, nome, modalidade, dia_semana, horario_inicio, horario_fim, professor, vagas_total, ativa, criado_em",
        )
        .order("nome", { ascending: true }),

      supabase
        .from("alunos_turmas")
        .select("id, aluno_id, turma_id, ativo")
        .eq("ativo", true),

      supabase
        .from("chamadas")
        .select("id, turma_id, data, observacoes, criado_em")
        .order("data", { ascending: false }),

      supabase
        .from("presencas")
        .select(
          "id, chamada_id, aluno_id, turma_id, data, status, observacao, criado_em",
        ),
    ]);

    if (alunosRes.error) {
      console.error(alunosRes.error);
      toast.error(`Erro ao carregar alunos: ${alunosRes.error.message}`);
      setCarregando(false);
      return;
    }

    if (preCadastrosRes.error) {
      console.error(preCadastrosRes.error);
      toast.error(
        `Erro ao carregar pré-cadastros: ${preCadastrosRes.error.message}`,
      );
      setCarregando(false);
      return;
    }

    if (turmasRes.error) {
      console.error(turmasRes.error);
      toast.error(`Erro ao carregar turmas: ${turmasRes.error.message}`);
      setCarregando(false);
      return;
    }

    if (alunosTurmasRes.error) {
      console.error(alunosTurmasRes.error);
      toast.error(
        `Erro ao carregar vínculos aluno/turma: ${alunosTurmasRes.error.message}`,
      );
      setCarregando(false);
      return;
    }

    if (chamadasRes.error) {
      console.error(chamadasRes.error);
      toast.error(`Erro ao carregar chamadas: ${chamadasRes.error.message}`);
      setCarregando(false);
      return;
    }

    if (presencasRes.error) {
      console.error(presencasRes.error);
      toast.error(`Erro ao carregar presenças: ${presencasRes.error.message}`);
      setCarregando(false);
      return;
    }

    setAlunos((alunosRes.data ?? []) as Aluno[]);
    setPreCadastros((preCadastrosRes.data ?? []) as PreCadastro[]);
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
    const alunosAtivos = alunos.filter((aluno) => aluno.ativo);
    const alunosAtivosIds = new Set(alunosAtivos.map((aluno) => aluno.id));

    const turmasAtivas = turmas.filter((turma) => turma.ativa);

    const vinculosAtivos = alunosTurmas.filter(
      (vinculo) => vinculo.ativo && alunosAtivosIds.has(vinculo.aluno_id),
    );

    const pendentes = preCadastros.filter(
      (pre) => pre.status === "pendente",
    ).length;

    const fila = preCadastros.filter(
      (pre) => pre.status === "fila de espera",
    ).length;

    const vagasConfiguradasTotal = turmasAtivas.reduce((acc, turma) => {
      const vagas = Number(turma.vagas_total ?? 0);
      return acc + Math.max(0, vagas);
    }, 0);

    const turmasComCapacidade = turmasAtivas.filter(
      (turma) => Number(turma.vagas_total ?? 0) > 0,
    ).length;

    const porMod = modalidades.map((modalidade) => ({
      modalidade,
      total: alunosAtivos.filter((aluno) => aluno.modalidade === modalidade)
        .length,
    }));

    const outrasModalidades = alunosAtivos.filter(
      (aluno) => !isModalidade(aluno.modalidade),
    ).length;

    const porTurma = turmasAtivas.map((turma) => {
      const inscritos = vinculosAtivos.filter(
        (vinculo) => vinculo.turma_id === turma.id,
      ).length;

      const vagas = Number(turma.vagas_total ?? 0);
      const capacidadeConfigurada = vagas > 0;
      const disponiveis = capacidadeConfigurada
        ? Math.max(0, vagas - inscritos)
        : null;

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

    const turmasLotadas = porTurma.filter((turma) => turma.lotada).length;

    const turmasMap = new Map(turmas.map((turma) => [turma.id, turma]));

    const presencasPorChamada = new Map<string, Presenca[]>();

    presencas.forEach((presenca) => {
      const lista = presencasPorChamada.get(presenca.chamada_id) ?? [];
      lista.push(presenca);
      presencasPorChamada.set(presenca.chamada_id, lista);
    });

    const presPorPeriodo = chamadas.map((chamada) => {
      const turma = turmasMap.get(chamada.turma_id);
      const registros = presencasPorChamada.get(chamada.id) ?? [];

      const counts = registros.reduce(
        (acc, registro) => {
          acc[registro.status] = (acc[registro.status] ?? 0) + 1;
          return acc;
        },
        {
          presente: 0,
          falta: 0,
          "falta justificada": 0,
        } as Record<StatusPresenca, number>,
      );

      return {
        chamadaId: chamada.id,
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

    presencas.forEach((presenca) => {
      const lista = presencasPorAluno.get(presenca.aluno_id) ?? [];
      lista.push(presenca);
      presencasPorAluno.set(presenca.aluno_id, lista);
    });

    const faltasPorAluno = alunosAtivos
      .map((aluno) => {
        const registros = presencasPorAluno.get(aluno.id) ?? [];

        const faltas = registros.filter(
          (registro) => registro.status === "falta",
        ).length;

        const justificadas = registros.filter(
          (registro) => registro.status === "falta justificada",
        ).length;

        const presentes = registros.filter(
          (registro) => registro.status === "presente",
        ).length;

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

    return {
      alunosAtivos,
      turmasAtivas,
      totalAlunos: alunos.length,
      totalAlunosAtivos: alunosAtivos.length,
      totalAlunosInativos: alunos.length - alunosAtivos.length,
      pendentes,
      fila,
      vagasConfiguradasTotal,
      turmasComCapacidade,
      turmasLotadas,
      porMod,
      outrasModalidades,
      porTurma,
      presPorPeriodo,
      faltasPorAluno,
    };
  }, [alunos, preCadastros, turmas, alunosTurmas, chamadas, presencas]);

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
          title="Pré-cadastros pendentes"
          value={relatorio.pendentes}
          description="Solicitações aguardando análise"
          icon={ClipboardList}
        />

        <ResumoCard
          title="Fila de espera"
          value={relatorio.fila}
          description="Pré-cadastros aguardando vaga"
          icon={Hourglass}
        />

        <ResumoCard
          title="Turmas ativas"
          value={relatorio.turmasAtivas.length}
          description="Turmas disponíveis no sistema"
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          title="Alunos inativos"
          value={relatorio.totalAlunosInativos}
          description="Registros mantidos no sistema"
          icon={Users}
        />

        <ResumoCard
          title="Capacidade definida"
          value={relatorio.turmasComCapacidade}
          description={`${relatorio.vagasConfiguradasTotal} vaga(s) configurada(s)`}
          icon={DoorOpen}
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

        <ResumoCard
          title="Chamadas salvas"
          value={chamadas.length}
          description="Registros de presença lançados"
          icon={ClipboardList}
        />
      </div>

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
              item.capacidadeConfigurada ? item.disponiveis ?? 0 : "—",
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
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Carregando relatório...
                </TableCell>
              </TableRow>
            )}

            {!carregando && relatorio.porTurma.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhuma turma ativa encontrada.
                </TableCell>
              </TableRow>
            )}

            {!carregando &&
              relatorio.porTurma.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.turma}</TableCell>
                  <TableCell>{item.modalidade}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.horario}
                  </TableCell>
                  <TableCell>{item.professor}</TableCell>
                  <TableCell className="text-right">{item.inscritos}</TableCell>
                  <TableCell className="text-right">
                    {item.capacidadeConfigurada ? (
                      item.vagas
                    ) : (
                      <span className="text-muted-foreground">
                        Não configurada
                      </span>
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
              [
                "Turma",
                "Modalidade",
                "Data",
                "Total",
                "Presentes",
                "Faltas",
                "Justificadas",
              ],
              ...relatorio.presPorPeriodo.map((item) => [
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
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Carregando presenças...
                  </TableCell>
                </TableRow>
              )}

              {!carregando && relatorio.presPorPeriodo.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhuma presença registrada ainda.
                  </TableCell>
                </TableRow>
              )}

              {!carregando &&
                relatorio.presPorPeriodo.map((item) => (
                  <TableRow key={item.chamadaId}>
                    <TableCell className="text-sm">
                      <p className="font-medium">{item.turma}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.modalidade}
                      </p>
                    </TableCell>
                    <TableCell>{formatarData(item.data)}</TableCell>
                    <TableCell className="text-right">{item.total}</TableCell>
                    <TableCell className="text-right">
                      {item.presentes}
                    </TableCell>
                    <TableCell className="text-right">{item.faltas}</TableCell>
                    <TableCell className="text-right">
                      {item.justificadas}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
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
              ...relatorio.faltasPorAluno.map((item) => [
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
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Carregando faltas...
                  </TableCell>
                </TableRow>
              )}

              {!carregando && relatorio.faltasPorAluno.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhuma falta registrada ainda.
                  </TableCell>
                </TableRow>
              )}

              {!carregando &&
                relatorio.faltasPorAluno.map((item) => (
                  <TableRow key={`${item.aluno}-${item.turma}`}>
                    <TableCell>
                      <p className="font-medium">{item.aluno}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.modalidade}
                      </p>
                    </TableCell>
                    <TableCell>{item.turma}</TableCell>
                    <TableCell className="text-right">
                      {item.presentes}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={item.faltas > 0 ? "destructive" : "outline"}
                      >
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
          @page {
            margin: 12mm;
          }

          html,
          body {
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          .print-report-root {
            color: #111827 !important;
            background: #ffffff !important;
          }

          .print-report-root .print-card {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            background: #ffffff !important;
          }

          .print-report-root table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          .print-report-root th,
          .print-report-root td {
            border-bottom: 1px solid #e5e7eb;
            padding: 6px 8px;
          }

          .print-report-root h2 {
            font-size: 20px;
            margin-bottom: 4px;
          }

          .print-report-root p {
            color: #374151 !important;
          }

          .print-report-root span,
          .print-report-root div,
          .print-report-root td,
          .print-report-root th {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
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
          <p className="mt-1 text-3xl font-semibold text-foreground">
            {value}
          </p>
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

function ModalidadeResumo({
  modalidade,
  total,
}: {
  modalidade: Modalidade;
  total: number;
}) {
  const config: Record<
    Modalidade,
    {
      icon: ComponentType<{ className?: string }>;
      descricao: string;
      className: string;
    }
  > = {
    "Natação Infantil": {
      icon: Baby,
      descricao: "8 a 17 anos",
      className: "bg-sky-50 text-sky-700",
    },
    "Natação Adulta": {
      icon: AdultSwimmingIcon,
      descricao: "18 anos ou mais",
      className: "bg-blue-50 text-blue-700",
    },
    Hidroginástica: {
      icon: HeartPulse,
      descricao: "18 anos ou mais",
      className: "bg-cyan-50 text-cyan-700",
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
          <p className="text-xs text-muted-foreground">
            {config[modalidade].descricao}
          </p>
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
          {description && (
            <CardDescription className="mt-1">{description}</CardDescription>
          )}
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