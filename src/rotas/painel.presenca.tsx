import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/utilitarios/supabase";
import { hojeBrasilia, calcIdade } from "@/utilitarios/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { Textarea } from "@/componentes/ui/textarea";
import {
  CheckCircle2,
  CheckSquare,
  Loader2,
  RefreshCw,
  Save,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/presenca")({
  head: () => ({ meta: [{ title: "Presença" }] }),
  component: PresencaAdmin,
});

type StatusPresenca = "presente" | "falta" | "falta justificada";
type FiltroModalidade = "todas" | "Natação Infantil" | "Natação Adulta" | "Hidroginástica";

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
};

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

const modalidades: FiltroModalidade[] = [
  "todas",
  "Natação Infantil",
  "Natação Adulta",
  "Hidroginástica",
];

const opcoes: Array<{
  v: StatusPresenca;
  label: string;
  className: string;
}> = [
  {
    v: "presente",
    label: "Presente",
    className: "text-green-700",
  },
  {
    v: "falta",
    label: "Falta",
    className: "text-red-700",
  },
  {
    v: "falta justificada",
    label: "Falta justificada",
    className: "text-yellow-700",
  },
];

function dataHoje() {
  return hojeBrasilia();
}

function formatarData(data?: string | null) {
  if (!data) return "—";

  const partes = data.split("-");

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const d = new Date(data);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("pt-BR");
}

function formatarHorario(inicio?: string | null, fim?: string | null) {
  const i = inicio ? inicio.slice(0, 5) : null;
  const f = fim ? fim.slice(0, 5) : null;

  if (i && f) return `${i} às ${f}`;
  if (i) return i;

  return "horário não informado";
}

function labelTurma(turma: Turma) {
  const dia = turma.dia_semana ? `${turma.dia_semana} — ` : "";
  const horario = formatarHorario(turma.horario_inicio, turma.horario_fim);

  return `${turma.nome} (${dia}${horario})`;
}

function textoBuscaTurma(turma: Turma) {
  return `${turma.nome} ${turma.modalidade} ${turma.dia_semana ?? ""} ${
    turma.professor ?? ""
  } ${turma.horario_inicio ?? ""} ${turma.horario_fim ?? ""}`.toLowerCase();
}

function PresencaAdmin() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [dataSel, setDataSel] = useState(dataHoje());
  const [alunosTurma, setAlunosTurma] = useState<Aluno[]>([]);
  const [chamadaId, setChamadaId] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [reg, setReg] = useState<Record<string, StatusPresenca>>({});
  const [carregandoTurmas, setCarregandoTurmas] = useState(true);
  const [carregandoChamada, setCarregandoChamada] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalidadeFiltro, setModalidadeFiltro] = useState<FiltroModalidade>("todas");
  const [buscaTurma, setBuscaTurma] = useState("");

  // Guarda qual chamada (turma+data) foi pedida por último, pra uma resposta
  // atrasada de uma troca de turma anterior não sobrescrever o estado atual.
  const requisicaoChamadaRef = useRef<string | null>(null);

  const turmasFiltradas = useMemo(() => {
    const busca = buscaTurma.trim().toLowerCase();

    return turmas.filter((turma) => {
      const passaModalidade = modalidadeFiltro === "todas" || turma.modalidade === modalidadeFiltro;

      const passaBusca = !busca || textoBuscaTurma(turma).includes(busca);

      return passaModalidade && passaBusca;
    });
  }, [turmas, modalidadeFiltro, buscaTurma]);

  const turmaSelecionada = useMemo(() => {
    return turmas.find((turma) => turma.id === turmaId) ?? null;
  }, [turmas, turmaId]);

  const turmaSelecionadaForaDoFiltro = useMemo(() => {
    if (!turmaId) return false;

    return !turmasFiltradas.some((turma) => turma.id === turmaId);
  }, [turmaId, turmasFiltradas]);

  const totais = useMemo(() => {
    return Object.values(reg).reduce(
      (acc, status) => {
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {
        presente: 0,
        falta: 0,
        "falta justificada": 0,
      } as Record<StatusPresenca, number>,
    );
  }, [reg]);

  async function carregarTurmas() {
    setCarregandoTurmas(true);

    const { data, error } = await supabase
      .from("turmas")
      .select(
        "id, nome, modalidade, dia_semana, horario_inicio, horario_fim, professor, vagas_total, ativa",
      )
      .eq("ativa", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error(error);
      toast.error(`Erro ao carregar turmas: ${error.message}`);
      setCarregandoTurmas(false);
      return;
    }

    const lista = (data ?? []) as Turma[];

    setTurmas(lista);

    if (!turmaId && lista.length > 0) {
      setTurmaId(lista[0].id);
    }

    setCarregandoTurmas(false);
  }

  async function carregarDadosDaChamada(idTurma: string, dataChamada: string) {
    const idRequisicao = `${idTurma}|${dataChamada}`;
    requisicaoChamadaRef.current = idRequisicao;
    const aindaAtual = () => requisicaoChamadaRef.current === idRequisicao;

    if (!idTurma || !dataChamada) {
      setAlunosTurma([]);
      setReg({});
      setChamadaId(null);
      setObservacoes("");
      return;
    }

    setCarregandoChamada(true);

    const { data: vinculos, error: vinculosError } = await supabase
      .from("alunos_turmas")
      .select("aluno_id")
      .eq("turma_id", idTurma)
      .eq("ativo", true);

    if (!aindaAtual()) return;

    if (vinculosError) {
      console.error(vinculosError);
      toast.error(`Erro ao carregar vínculos da turma: ${vinculosError.message}`);
      setCarregandoChamada(false);
      return;
    }

    const alunoIds = (vinculos ?? []).map((vinculo) => vinculo.aluno_id).filter(Boolean);

    let alunos: Aluno[] = [];

    if (alunoIds.length > 0) {
      const { data: alunosData, error: alunosError } = await supabase
        .from("alunos")
        .select(
          "id, nome_completo, nascimento, idade, modalidade, turma, responsavel, telefone, whatsapp, email, observacoes, ativo",
        )
        .in("id", alunoIds)
        .eq("ativo", true)
        .order("nome_completo", { ascending: true });

      if (!aindaAtual()) return;

      if (alunosError) {
        console.error(alunosError);
        toast.error(`Erro ao carregar alunos da turma: ${alunosError.message}`);
        setCarregandoChamada(false);
        return;
      }

      alunos = (alunosData ?? []) as Aluno[];
    }

    const { data: chamadaData, error: chamadaError } = await supabase
      .from("chamadas")
      .select("id, turma_id, data, observacoes, criado_em")
      .eq("turma_id", idTurma)
      .eq("data", dataChamada)
      .maybeSingle();

    if (!aindaAtual()) return;

    if (chamadaError) {
      console.error(chamadaError);
      toast.error(`Erro ao carregar chamada: ${chamadaError.message}`);
      setCarregandoChamada(false);
      return;
    }

    const chamada = chamadaData as Chamada | null;

    let presencas: Presenca[] = [];

    if (chamada?.id) {
      const { data: presencasData, error: presencasError } = await supabase
        .from("presencas")
        .select("id, chamada_id, aluno_id, turma_id, data, status, observacao, criado_em")
        .eq("chamada_id", chamada.id);

      if (!aindaAtual()) return;

      if (presencasError) {
        console.error(presencasError);
        toast.error(`Erro ao carregar presenças: ${presencasError.message}`);
        setCarregandoChamada(false);
        return;
      }

      presencas = (presencasData ?? []) as Presenca[];
    }

    const mapaPresencas = new Map<string, StatusPresenca>();

    presencas.forEach((presenca) => {
      mapaPresencas.set(presenca.aluno_id, presenca.status);
    });

    const registrosIniciais: Record<string, StatusPresenca> = {};

    alunos.forEach((aluno) => {
      registrosIniciais[aluno.id] = mapaPresencas.get(aluno.id) ?? "presente";
    });

    if (!aindaAtual()) return;

    setAlunosTurma(alunos);
    setChamadaId(chamada?.id ?? null);
    setObservacoes(chamada?.observacoes ?? "");
    setReg(registrosIniciais);
    setCarregandoChamada(false);
  }

  useEffect(() => {
    carregarTurmas();
  }, []);

  useEffect(() => {
    carregarDadosDaChamada(turmaId, dataSel);
  }, [turmaId, dataSel]);

  function selecionarPrimeiraTurmaFiltrada() {
    const primeira = turmasFiltradas[0];

    if (!primeira) {
      toast.info("Nenhuma turma encontrada com os filtros atuais.");
      return;
    }

    setTurmaId(primeira.id);
  }

  function limparFiltros() {
    setModalidadeFiltro("todas");
    setBuscaTurma("");
  }

  function marcarTodos(status: StatusPresenca) {
    const novoRegistro: Record<string, StatusPresenca> = {};

    alunosTurma.forEach((aluno) => {
      novoRegistro[aluno.id] = status;
    });

    setReg(novoRegistro);
  }

  async function salvar() {
    if (!turmaId) {
      toast.error("Selecione uma turma.");
      return;
    }

    if (!dataSel) {
      toast.error("Selecione uma data.");
      return;
    }

    if (alunosTurma.length === 0) {
      toast.error("Esta turma ainda não possui alunos ativos vinculados.");
      return;
    }

    setSalvando(true);

    const { data: chamadaData, error: chamadaError } = await supabase
      .from("chamadas")
      .upsert(
        {
          turma_id: turmaId,
          data: dataSel,
          observacoes: observacoes.trim() || null,
        },
        {
          onConflict: "turma_id,data",
        },
      )
      .select("id")
      .single();

    if (chamadaError) {
      console.error(chamadaError);
      toast.error(`Erro ao salvar chamada: ${chamadaError.message}`);
      setSalvando(false);
      return;
    }

    const idChamada = chamadaData.id as string;

    const { error: deleteError } = await supabase
      .from("presencas")
      .delete()
      .eq("chamada_id", idChamada);

    if (deleteError) {
      console.error(deleteError);
      toast.error(`Erro ao atualizar registros antigos: ${deleteError.message}`);
      setSalvando(false);
      return;
    }

    const registros = alunosTurma.map((aluno) => ({
      chamada_id: idChamada,
      aluno_id: aluno.id,
      turma_id: turmaId,
      data: dataSel,
      status: reg[aluno.id] ?? "presente",
      observacao: null,
    }));

    const { error: insertError } = await supabase.from("presencas").insert(registros);

    if (insertError) {
      console.error(insertError);
      toast.error(`Erro ao salvar presenças: ${insertError.message}`);
      setSalvando(false);
      return;
    }

    setChamadaId(idChamada);
    setSalvando(false);
    toast.success("Presença salva com sucesso.");
  }

  const carregando = carregandoTurmas || carregandoChamada;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                Chamada digital
              </CardTitle>
              <CardDescription>
                Filtre a modalidade, selecione a turma e registre a presença dos alunos.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                carregarTurmas();
                if (turmaId) carregarDadosDaChamada(turmaId, dataSel);
              }}
              disabled={carregando || salvando}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[220px_1fr_auto]">
            <div className="space-y-1.5">
              <Label>Modalidade</Label>
              <Select
                value={modalidadeFiltro}
                onValueChange={(value) => setModalidadeFiltro(value as FiltroModalidade)}
                disabled={carregandoTurmas || salvando}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>

                <SelectContent>
                  {modalidades.map((modalidade) => (
                    <SelectItem key={modalidade} value={modalidade}>
                      {modalidade === "todas" ? "Todas as modalidades" : modalidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Buscar turma</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={buscaTurma}
                  onChange={(event) => setBuscaTurma(event.target.value)}
                  placeholder="Buscar por turma, professor, dia ou horário"
                  className="pl-9"
                  disabled={carregandoTurmas || salvando}
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={limparFiltros}
                disabled={carregandoTurmas || salvando}
              >
                Limpar
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={selecionarPrimeiraTurmaFiltrada}
                disabled={carregandoTurmas || salvando || turmasFiltradas.length === 0}
              >
                Usar 1ª
              </Button>
            </div>
          </div>

          {turmaSelecionadaForaDoFiltro && (
            <div className="rounded-md border border-dashed border-border bg-accent/30 px-3 py-2 text-sm text-muted-foreground">
              A turma selecionada não aparece nos filtros atuais. Clique em “Usar 1ª” para
              selecionar a primeira turma filtrada ou limpe os filtros.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[1.2fr_220px_1fr]">
            <div className="space-y-1.5">
              <Label>Turma</Label>
              <Select
                value={turmaId}
                onValueChange={setTurmaId}
                disabled={carregandoTurmas || salvando || turmasFiltradas.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>

                <SelectContent>
                  {turmasFiltradas.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {labelTurma(turma)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {turmasFiltradas.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma turma encontrada com os filtros atuais.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={dataSel}
                onChange={(event) => setDataSel(event.target.value)}
                disabled={salvando}
              />
            </div>

            <div className="flex items-end justify-end">
              <Button
                type="button"
                onClick={salvar}
                disabled={salvando || carregando || alunosTurma.length === 0}
                size="lg"
                className="w-full md:w-auto"
              >
                {salvando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar presença
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alunos na turma</CardDescription>
            <CardTitle>{alunosTurma.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Presentes</CardDescription>
            <CardTitle className="text-green-700">{totais["presente"] ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Faltas</CardDescription>
            <CardTitle className="text-red-700">{totais["falta"] ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Justificadas</CardDescription>
            <CardTitle className="text-yellow-700">{totais["falta justificada"] ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Alunos da turma</CardTitle>
              <CardDescription>
                {turmaSelecionada
                  ? `${turmaSelecionada.nome} · ${formatarData(dataSel)}`
                  : "Selecione uma turma para iniciar a chamada."}
                {chamadaId ? " · chamada já registrada" : ""}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => marcarTodos("presente")}
                disabled={alunosTurma.length === 0 || carregando || salvando}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Todos presentes
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => marcarTodos("falta")}
                disabled={alunosTurma.length === 0 || carregando || salvando}
              >
                <UserX className="mr-2 h-4 w-4" />
                Todos falta
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {carregando ? (
            <div className="flex items-center justify-center rounded-md border border-dashed border-border p-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando chamada...
            </div>
          ) : alunosTurma.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Esta turma ainda não possui alunos ativos vinculados. Vá até a tela de Alunos para
              fazer a vinculação.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {alunosTurma.map((aluno) => (
                <li
                  key={aluno.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{aluno.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">
                      {aluno.nascimento ? calcIdade(aluno.nascimento) : "—"} anos
                      {aluno.responsavel ? ` · Responsável: ${aluno.responsavel}` : ""}
                    </p>
                  </div>

                  <RadioGroup
                    value={reg[aluno.id] ?? "presente"}
                    onValueChange={(value) =>
                      setReg((atual) => ({
                        ...atual,
                        [aluno.id]: value as StatusPresenca,
                      }))
                    }
                    className="flex flex-wrap gap-3"
                  >
                    {opcoes.map((opcao) => (
                      <label
                        key={opcao.v}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                      >
                        <RadioGroupItem value={opcao.v} id={`${aluno.id}-${opcao.v}`} />
                        <span className={opcao.className}>{opcao.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Observações da chamada
          </CardTitle>
          <CardDescription>
            Campo opcional para registrar informações gerais sobre a aula do dia.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Textarea
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            placeholder="Exemplo: aula normal, piscina em manutenção parcial, chuva forte, atividade especial..."
            disabled={salvando}
          />
        </CardContent>
      </Card>
    </div>
  );
}
