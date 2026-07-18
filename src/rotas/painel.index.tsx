import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase, buscarTodasLinhas } from "@/utilitarios/supabase";
import { getSessao, permissoesPorPerfil, type Permissao, type Sessao } from "@/utilitarios/autenticacao";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";

import {
  CalendarDays,
  CheckSquare,
  Megaphone,
  ArrowRight,
  BarChart3,
  RefreshCw,
  Loader2,
  Users,
  BookOpenCheck,
  ClipboardCheck,
  DoorOpen,
  Gift,
  Clock,
  UserCheck,
  FileText,
  Hourglass,
  type LucideIcon,
} from "lucide-react";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/painel/")({
  head: () => ({
    meta: [{ title: "Painel Administrativo" }],
  }),
  component: Painel,
});

type Aluno = {
  id: string;
  nome_completo: string;
  nascimento: string | null;
  idade: number | null;
  modalidade: string | null;
  turma: string | null;
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
  vagas_total: number | null;
  ativa: boolean;
};

type AlunoTurma = {
  id: string;
  aluno_id: string;
  turma_id: string;
  ativo: boolean;
};

type DashboardTo =
  | "/painel/pre-cadastros"
  | "/painel/alunos"
  | "/painel/avisos-admin"
  | "/painel/turmas"
  | "/painel/presenca"
  | "/painel/relatorios"
  | "/painel/documentos";

type DashboardCard = {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  to: DashboardTo;
  permissao: Permissao;
};

type DiaReferencia = {
  dia: number;
  distancia: number;
};

const modalidades = ["Natação Infantil", "Natação Adulta", "Hidroginástica"];

function formatarData(data?: string | null) {
  if (!data) return "—";

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);

  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  const d = new Date(data);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("pt-BR");
}

function formatarHorario(inicio?: string | null, fim?: string | null) {
  const i = inicio ? inicio.slice(0, 5) : null;
  const f = fim ? fim.slice(0, 5) : null;

  if (i && f) return `${i} às ${f}`;
  if (i) return i;

  return "—";
}

function minutosDoHorario(horario?: string | null) {
  if (!horario) return null;

  const [hora, minuto] = horario.split(":");

  const h = Number(hora);
  const m = Number(minuto);

  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  return h * 60 + m;
}

function areaPorPerfil(perfil?: string) {
  if (perfil === "Administrador") return "Administração";
  if (perfil === "Recepção") return "Recepção";
  if (perfil === "Professor") return "Professor";

  return "Equipe";
}

function descricaoPainel(perfil?: string) {
  if (perfil === "Administrador") {
    return "Visão geral completa para gestão, acompanhamento e manutenção do sistema.";
  }

  if (perfil === "Recepção") {
    return "Acompanhamento de alunos, turmas, documentos, listas de espera, avisos e presença.";
  }

  if (perfil === "Professor") {
    return "Acesso rápido às turmas e ao controle de presença.";
  }

  return "Painel interno do centro.";
}

function normalizarTexto(valor?: string | null) {
  return (valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mesDeData(data?: string | null) {
  if (!data) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);

  if (m) return Number(m[2]);

  const d = new Date(data);

  if (Number.isNaN(d.getTime())) return null;

  return d.getMonth() + 1;
}

function diaDeData(data?: string | null) {
  if (!data) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);

  if (m) return Number(m[3]);

  const d = new Date(data);

  if (Number.isNaN(d.getTime())) return null;

  return d.getDate();
}

function diaLabel(numero: number) {
  if (numero === 0) return "Domingo";
  if (numero === 1) return "Segunda-feira";
  if (numero === 2) return "Terça-feira";
  if (numero === 3) return "Quarta-feira";
  if (numero === 4) return "Quinta-feira";
  if (numero === 5) return "Sexta-feira";
  if (numero === 6) return "Sábado";

  return "Próximo dia útil";
}

function turmaAconteceNoDia(turma: Turma, dia: number) {
  const texto = normalizarTexto(turma.dia_semana);

  if (dia === 0) return texto.includes("domingo");
  if (dia === 1) return texto.includes("segunda");
  if (dia === 2) return texto.includes("terca");
  if (dia === 3) return texto.includes("quarta");
  if (dia === 4) return texto.includes("quinta");
  if (dia === 5) return texto.includes("sexta");
  if (dia === 6) return texto.includes("sabado");

  return false;
}

function buscarDiaReferencia(turmas: Turma[]): DiaReferencia {
  const agora = new Date();
  const hoje = agora.getDay();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  const diasPossiveis = [0, 1, 2, 3, 4, 5, 6];

  for (let distancia = 0; distancia <= 7; distancia++) {
    const dia = (hoje + distancia) % 7;

    if (!diasPossiveis.includes(dia)) continue;

    const turmasDoDia = turmas.filter((turma) => turmaAconteceNoDia(turma, dia));

    if (turmasDoDia.length === 0) continue;

    if (distancia === 0) {
      const aindaHoje = turmasDoDia.some((turma) => {
        const minutos = minutosDoHorario(turma.horario_inicio);
        return minutos === null || minutos >= minutosAgora;
      });

      if (aindaHoje) return { dia, distancia };
    } else {
      return { dia, distancia };
    }
  }

  return { dia: 1, distancia: 0 };
}

function descricaoDiaReferencia(ref: DiaReferencia) {
  if (ref.distancia === 0) {
    return "Hoje — próximas aulas a partir do horário atual.";
  }

  if (ref.distancia === 1) {
    return `Amanhã, ${diaLabel(ref.dia).toLowerCase()} — próximas aulas cadastradas.`;
  }

  return `${diaLabel(ref.dia)} — próximo dia com aulas cadastradas.`;
}

function formatarPercentualOcupacao(vagasOcupadas: number, totalVagas: number) {
  if (totalVagas <= 0) return "0%";

  const percentual = (vagasOcupadas / totalVagas) * 100;

  if (percentual > 0 && percentual < 1) return "<1%";

  return `${Math.round(percentual)}%`;
}

function larguraBarraOcupacao(vagasOcupadas: number, totalVagas: number) {
  if (totalVagas <= 0 || vagasOcupadas <= 0) return 0;

  const percentual = (vagasOcupadas / totalVagas) * 100;

  return Math.max(1, Math.min(100, percentual));
}

function Painel() {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunosTurmas, setAlunosTurmas] = useState<AlunoTurma[]>([]);
  const [avisosPublicadosCount, setAvisosPublicadosCount] = useState(0);
  const [filaEsperaCount, setFilaEsperaCount] = useState(0);
  const [documentosPendentesCount, setDocumentosPendentesCount] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const sessaoAtual = getSessao();

    setSessao(sessaoAtual);
    carregar(sessaoAtual);
  }, []);

  async function carregar(sessaoAtual: Sessao | null) {
    setCarregando(true);

    if (!sessaoAtual) {
      setAlunos([]);
      setTurmas([]);
      setAlunosTurmas([]);
      setAvisosPublicadosCount(0);
      setFilaEsperaCount(0);
      setDocumentosPendentesCount(0);
      setCarregando(false);
      return;
    }

    const permissoes = permissoesPorPerfil[sessaoAtual.perfil] ?? [];
    const tem = (permissao: Permissao) => permissoes.includes(permissao);

    let alunosLista: Aluno[] = [];
    let turmasLista: Turma[] = [];
    let vinculosLista: AlunoTurma[] = [];
    let avisosCount = 0;
    let filaCount = 0;
    let documentosCount = 0;

    if (tem("avisos")) {
      const { count, error } = await supabase
        .from("avisos")
        .select("id", { count: "exact", head: true })
        .eq("publico", true);

      if (error) {
        console.error(error);
      } else {
        avisosCount = count ?? 0;
      }
    }

    // "pre-cadastros" é o nome histórico dessa permissão em lib/auth.ts.
    // A TABELA por trás já foi renomeada pra lista_espera — só a chave
    // de permissão continua com o nome antigo. Ver observação em
    // _admin.tsx sobre confirmar se essa permissão bate com o que o
    // menu (admin-sidebar.tsx) usa pra mostrar o link.
    if (tem("pre-cadastros")) {
      const { count, error } = await supabase
        .from("lista_espera")
        .select("id", { count: "exact", head: true })
        .eq("status", "fila de espera");

      if (error) {
        console.error(error);
      } else {
        filaCount = count ?? 0;
      }
    }

    if (tem("alunos")) {
      const { data, error } = await buscarTodasLinhas<Aluno>(
        "alunos",
        "id, nome_completo, nascimento, idade, modalidade, turma, ativo, criado_em",
        { ordenarPor: "criado_em", ascendente: false },
      );

      if (error) {
        console.error(error);
      } else {
        alunosLista = (data ?? []) as Aluno[];
      }

      const { count: docsCount, error: docsError } = await supabase
        .from("documentos_aluno")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente");

      if (docsError) {
        console.error(docsError);
      } else {
        documentosCount = docsCount ?? 0;
      }
    }

    if (tem("turmas")) {
      const { data, error } = await supabase
        .from("turmas")
        .select(
          "id, nome, modalidade, dia_semana, horario_inicio, horario_fim, professor, vagas_total, ativa",
        )
        .order("horario_inicio", { ascending: true });

      if (error) {
        console.error(error);
      } else {
        turmasLista = (data ?? []) as Turma[];
      }

      const { data: vinculos, error: vinculosError } = await buscarTodasLinhas<AlunoTurma>(
        "alunos_turmas",
        "id, aluno_id, turma_id, ativo",
        { aplicarFiltros: (q) => q.eq("ativo", true) },
      );

      if (vinculosError) {
        console.error(vinculosError);
      } else {
        vinculosLista = (vinculos ?? []) as AlunoTurma[];
      }
    }

    setAlunos(alunosLista);
    setTurmas(turmasLista);
    setAlunosTurmas(vinculosLista);
    setAvisosPublicadosCount(avisosCount);
    setFilaEsperaCount(filaCount);
    setDocumentosPendentesCount(documentosCount);
    setCarregando(false);
  }

  const permissoes = useMemo(() => {
    if (!sessao) return [];
    return permissoesPorPerfil[sessao.perfil] ?? [];
  }, [sessao]);

  const temPermissao = (permissao: Permissao) => {
    return permissoes.includes(permissao);
  };

  const dados = useMemo(() => {
    const alunosAtivos = alunos.filter((aluno) => aluno.ativo);
    const alunosAtivosIds = new Set(alunosAtivos.map((aluno) => aluno.id));

    const turmasAtivas = turmas.filter((turma) => turma.ativa);
    const turmasAtivasIds = new Set(turmasAtivas.map((turma) => turma.id));

    const vinculosAtivos = alunosTurmas.filter(
      (vinculo) =>
        vinculo.ativo &&
        alunosAtivosIds.has(vinculo.aluno_id) &&
        turmasAtivasIds.has(vinculo.turma_id),
    );

    const totalVagas = turmasAtivas.reduce((acc, turma) => {
      return acc + Math.max(0, Number(turma.vagas_total ?? 0));
    }, 0);

    const vagasOcupadas = vinculosAtivos.length;
    const vagasDisponiveis = totalVagas > 0 ? Math.max(0, totalVagas - vagasOcupadas) : 0;

    const ocupacaoNumero = totalVagas > 0 ? Math.round((vagasOcupadas / totalVagas) * 100) : 0;

    const ocupacaoTexto = formatarPercentualOcupacao(vagasOcupadas, totalVagas);

    const ocupacaoBarra = larguraBarraOcupacao(vagasOcupadas, totalVagas);

    const alunosPorModalidade = modalidades.map((modalidade) => ({
      modalidade: modalidade.replace("Natação ", "Nat. "),
      alunos: alunosAtivos.filter((aluno) => aluno.modalidade === modalidade).length,
    }));

    const contagemPorTurma = new Map<string, number>();

    vinculosAtivos.forEach((vinculo) => {
      contagemPorTurma.set(vinculo.turma_id, (contagemPorTurma.get(vinculo.turma_id) ?? 0) + 1);
    });

    const ocupacaoPorTurma = turmasAtivas
      .map((turma) => {
        const inscritos = contagemPorTurma.get(turma.id) ?? 0;
        const vagas = Math.max(0, Number(turma.vagas_total ?? 0));

        const percentual = vagas > 0 ? Math.round((inscritos / vagas) * 100) : 0;

        const larguraBarra =
          vagas > 0 && inscritos > 0 ? Math.max(1, Math.min(100, (inscritos / vagas) * 100)) : 0;

        return {
          id: turma.id,
          nome: turma.nome,
          modalidade: turma.modalidade,
          horario: `${turma.dia_semana ?? "Dias não informados"} · ${formatarHorario(
            turma.horario_inicio,
            turma.horario_fim,
          )}`,
          inscritos,
          vagas,
          percentual,
          larguraBarra,
          lotada: vagas > 0 && inscritos >= vagas,
        };
      })
      .filter((turma) => turma.inscritos > 0)
      .sort((a, b) => b.percentual - a.percentual)
      .slice(0, 8);

    const mesAtual = new Date().getMonth() + 1;

    const aniversariantes = alunosAtivos
      .filter((aluno) => mesDeData(aluno.nascimento) === mesAtual)
      .map((aluno) => ({
        id: aluno.id,
        nome: aluno.nome_completo,
        dia: diaDeData(aluno.nascimento) ?? 0,
        idade: aluno.idade ?? "—",
        modalidade: aluno.modalidade ?? "—",
      }))
      .sort((a, b) => a.dia - b.dia);

    const diaReferencia = buscarDiaReferencia(turmasAtivas);
    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

    const proximasTurmas = turmasAtivas
      .filter((turma) => turmaAconteceNoDia(turma, diaReferencia.dia))
      .filter((turma) => {
        if (diaReferencia.distancia !== 0) return true;

        const minutos = minutosDoHorario(turma.horario_inicio);

        return minutos === null || minutos >= minutosAgora;
      })
      .sort((a, b) => (a.horario_inicio ?? "").localeCompare(b.horario_inicio ?? ""))
      .slice(0, 10);

    return {
      alunosAtivos,
      turmasAtivas,
      totalVagas,
      vagasOcupadas,
      vagasDisponiveis,
      ocupacaoNumero,
      ocupacaoTexto,
      ocupacaoBarra,
      alunosPorModalidade,
      ocupacaoPorTurma,
      aniversariantes,
      proximasTurmas,
      diaReferencia,
    };
  }, [alunos, turmas, alunosTurmas]);

  const cardsEstatisticas = useMemo<DashboardCard[]>(() => {
    const todos: DashboardCard[] = [
      {
        title: "Alunos ativos",
        value: dados.alunosAtivos.length,
        description: "Alunos atualmente ativos",
        icon: Users,
        to: "/painel/alunos",
        permissao: "alunos",
      },
      {
        title: "Turmas ativas",
        value: dados.turmasAtivas.length,
        description: "Turmas disponíveis no sistema",
        icon: CalendarDays,
        to: "/painel/turmas",
        permissao: "turmas",
      },
      {
        title: "Vagas ocupadas",
        value: dados.vagasOcupadas,
        description: `${dados.ocupacaoTexto} da capacidade configurada`,
        icon: UserCheck,
        to: "/painel/turmas",
        permissao: "turmas",
      },
      {
        title: "Vagas disponíveis",
        value: dados.vagasDisponiveis,
        description: `${dados.totalVagas} vaga(s) configurada(s)`,
        icon: DoorOpen,
        to: "/painel/turmas",
        permissao: "turmas",
      },
      {
        title: "Fila de espera",
        value: filaEsperaCount,
        description: "Pessoas aguardando vaga",
        icon: Hourglass,
        to: "/painel/pre-cadastros",
        permissao: "pre-cadastros",
      },
      {
        title: "Documentos pendentes",
        value: documentosPendentesCount,
        description: "Atestados e PAR-Q aguardando análise",
        icon: FileText,
        to: "/painel/documentos",
        permissao: "alunos",
      },
      {
        title: "Avisos publicados",
        value: avisosPublicadosCount,
        description: "Comunicados visíveis no site",
        icon: Megaphone,
        to: "/painel/avisos-admin",
        permissao: "avisos",
      },
    ];

    return todos.filter((card) => permissoes.includes(card.permissao));
  }, [dados, permissoes, filaEsperaCount, documentosPendentesCount, avisosPublicadosCount]);

  const cardsAtalhos = useMemo<DashboardCard[]>(() => {
    const todos: DashboardCard[] = [
      {
        title: "Chamada digital",
        value: "Abrir",
        description: "Registrar presença dos alunos",
        icon: CheckSquare,
        to: "/painel/presenca",
        permissao: "presenca",
      },
      {
        title: "Relatórios",
        value: "Abrir",
        description: "Indicadores, faltas e exportações",
        icon: BarChart3,
        to: "/painel/relatorios",
        permissao: "relatorios",
      },
    ];

    return todos.filter((card) => permissoes.includes(card.permissao));
  }, [permissoes]);

  if (!sessao && !carregando) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Acesso não identificado</CardTitle>

            <CardDescription>
              Para acessar o painel, entre novamente com um usuário autorizado.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Link to="/painel/login">
              <Button>Ir para o login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-accent/30 px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-foreground">Painel interno – Hidro e Natação Monsenhor</p>

          <p>
            Usuário:{" "}
            <span className="font-medium text-foreground">{areaPorPerfil(sessao?.perfil)}</span>
            {" · "}
            {descricaoPainel(sessao?.perfil)}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => carregar(sessao)}
          disabled={carregando || !sessao}
        >
          {carregando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Indicadores gerais</h2>

          <p className="text-sm text-muted-foreground">
            Resumo operacional com dados reais do sistema.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cardsEstatisticas.map((card) => {
            const Icon = card.icon;

            return (
              <Link to={card.to} key={card.title}>
                <Card
                  className="h-full transition-shadow hover:shadow-md"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardDescription>{card.title}</CardDescription>

                      <CardTitle className="text-3xl">{carregando ? "..." : card.value}</CardTitle>
                    </div>

                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                  </CardHeader>

                  <CardContent className="text-xs text-muted-foreground">
                    {card.description}
                    <span className="ml-1">→</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {cardsAtalhos.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Ações rápidas</h2>

            <p className="text-sm text-muted-foreground">
              Atalhos para rotinas administrativas mais usadas.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {cardsAtalhos.map((card) => {
              const Icon = card.icon;

              return (
                <Link to={card.to} key={card.title}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div>
                        <CardDescription>{card.title}</CardDescription>

                        <CardTitle className="text-2xl">
                          {carregando ? "..." : card.value}
                        </CardTitle>
                      </div>

                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                    </CardHeader>

                    <CardContent className="text-xs text-muted-foreground">
                      {card.description}
                      <span className="ml-1">→</span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {cardsEstatisticas.length === 0 && cardsAtalhos.length === 0 && !carregando && (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum recurso liberado</CardTitle>

            <CardDescription>Este perfil ainda não possui permissões configuradas.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {sessao?.perfil === "Professor" && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenCheck className="h-5 w-5 text-primary" />
                Área do professor
              </CardTitle>

              <CardDescription>
                Acesso rápido às ações mais importantes durante a rotina de aula.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Link to="/painel/turmas">
                <Button variant="outline" className="h-12 w-full justify-start">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Ver turmas
                </Button>
              </Link>

              <Link to="/painel/presenca">
                <Button className="h-12 w-full justify-start">
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Fazer chamada
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Rotina sugerida
              </CardTitle>

              <CardDescription>Sequência simples para uso em aula.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border p-3">
                <p className="font-medium text-foreground">1. Conferir turma</p>
                <p>Verifique o horário e a turma antes da aula.</p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="font-medium text-foreground">2. Fazer chamada</p>
                <p>Marque presença, falta ou falta justificada.</p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="font-medium text-foreground">3. Salvar registro</p>
                <p>Confirme a chamada para manter o histórico no sistema.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(temPermissao("alunos") || temPermissao("turmas")) && (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          {temPermissao("alunos") && (
            <Card>
              <CardHeader>
                <CardTitle>Alunos ativos por modalidade</CardTitle>

                <CardDescription>
                  Distribuição atual dos alunos cadastrados e ativos.
                </CardDescription>
              </CardHeader>

              <CardContent className="h-72 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dados.alunosPorModalidade}
                    margin={{
                      top: 8,
                      right: 8,
                      bottom: 0,
                      left: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />

                    <XAxis
                      dataKey="modalidade"
                      tick={{ fontSize: 12 }}
                      stroke="var(--color-muted-foreground)"
                    />

                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                      stroke="var(--color-muted-foreground)"
                      width={32}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                      }}
                    />

                    <Bar dataKey="alunos" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {temPermissao("turmas") && (
            <Card>
              <CardHeader>
                <CardTitle>Ocupação geral</CardTitle>

                <CardDescription>
                  Relação entre vagas ocupadas e vagas configuradas.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ocupação</span>
                    <span className="font-medium">{dados.ocupacaoTexto}</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${dados.ocupacaoBarra}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xl font-semibold">{dados.totalVagas}</p>
                    <p className="text-xs text-muted-foreground">Vagas</p>
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xl font-semibold">{dados.vagasOcupadas}</p>
                    <p className="text-xs text-muted-foreground">Ocupadas</p>
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xl font-semibold">{dados.vagasDisponiveis}</p>
                    <p className="text-xs text-muted-foreground">Livres</p>
                  </div>
                </div>

                <Link to="/painel/turmas">
                  <Button variant="outline" size="sm" className="w-full">
                    Ver controle de turmas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(temPermissao("turmas") || temPermissao("alunos")) && (
        <div className="grid gap-4 xl:grid-cols-2">
          {temPermissao("turmas") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Próximas turmas
                </CardTitle>

                <CardDescription>{descricaoDiaReferencia(dados.diaReferencia)}</CardDescription>
              </CardHeader>

              <CardContent className="max-h-85 space-y-2 overflow-y-auto pr-1">
                {dados.proximasTurmas.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma turma ativa encontrada para o próximo horário.
                  </p>
                )}

                {dados.proximasTurmas.map((turma) => (
                  <div
                    key={turma.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{turma.nome}</p>

                      <p className="text-xs text-muted-foreground">
                        {turma.modalidade} · {turma.dia_semana}
                      </p>
                    </div>

                    <Badge variant="outline">
                      {formatarHorario(turma.horario_inicio, turma.horario_fim)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {temPermissao("alunos") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Aniversariantes do mês
                </CardTitle>

                <CardDescription>Alunos ativos com aniversário neste mês.</CardDescription>
              </CardHeader>

              <CardContent className="max-h-85 space-y-2 overflow-y-auto pr-1">
                {dados.aniversariantes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum aniversariante ativo neste mês.
                  </p>
                )}

                {dados.aniversariantes.map((aluno) => (
                  <div
                    key={aluno.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{aluno.nome}</p>

                      <p className="text-xs text-muted-foreground">
                        {aluno.modalidade} · {aluno.idade} anos
                      </p>
                    </div>

                    <Badge variant="outline">Dia {aluno.dia}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {temPermissao("turmas") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Turmas com maior ocupação</CardTitle>

              <CardDescription>
                Turmas com alunos vinculados, ordenadas pela ocupação.
              </CardDescription>
            </div>

            <Link to="/painel/turmas">
              <Button size="sm" variant="ghost">
                Ver turmas
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="max-h-107.5 space-y-3 overflow-y-auto pr-1">
            {dados.ocupacaoPorTurma.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma turma possui aluno vinculado ainda.
              </p>
            )}

            {dados.ocupacaoPorTurma.map((turma) => (
              <div key={turma.id} className="rounded-md border border-border p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{turma.nome}</p>

                    <p className="text-xs text-muted-foreground">
                      {turma.modalidade} · {turma.horario}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={turma.lotada ? "destructive" : "outline"}>
                      {turma.inscritos}/{turma.vagas}
                    </Badge>

                    <Badge variant="outline">{turma.percentual}%</Badge>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      turma.lotada
                        ? "h-full rounded-full bg-destructive"
                        : "h-full rounded-full bg-primary"
                    }
                    style={{ width: `${turma.larguraBarra}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
