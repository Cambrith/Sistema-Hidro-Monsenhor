import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase, buscarTodasLinhas } from "@/lib/supabase";
import { getSessao } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Eye,
  FileText,
  History,
  MessageSquarePlus,
  CalendarClock,
  Phone,
  Mail,
  Users,
  MapPin,
  IdCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/alunos")({
  head: () => ({ meta: [{ title: "Gerenciamento de Alunos" }] }),
  component: AlunosAdmin,
});

type Modalidade = "Natação Infantil" | "Natação Adulta" | "Hidroginástica";
type StatusAluno = "ativo" | "inativo";
type Nivel = "iniciante" | "intermediario" | "avancado";

const niveis: { value: Nivel; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
];

function labelNivel(nivel?: Nivel | null) {
  return niveis.find((n) => n.value === nivel)?.label ?? "Não avaliado";
}

type Aluno = {
  id: string;
  nome_completo: string;
  nascimento: string;
  idade: number;
  modalidade: string;
  turma: string | null;
  responsavel: string | null;
  telefone: string | null;
  telefone_fixo: string | null;
  whatsapp: string;
  email: string | null;
  cpf: string | null;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  nome_pai: string | null;
  nome_mae: string | null;
  atestado_validade: string | null;
  parq_validade: string | null;
  nivel: Nivel | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
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
};

type OcorrenciaAluno = {
  id: string;
  aluno_id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  registrado_por: string | null;
  criado_em: string;
};

const SEM_TURMA = "__sem_turma__";

const modalidades: Modalidade[] = ["Natação Infantil", "Natação Adulta", "Hidroginástica"];

const tiposOcorrencia = [
  "Observação",
  "Atestado médico",
  "Contato com responsável",
  "Transferência de turma",
  "Presença/Falta",
  "Saúde/Limitação",
  "Administrativo",
];

function calcIdade(nascimento: string) {
  if (!nascimento) return 0;
  const dataNascimento = new Date(nascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNascimento.getFullYear();
  const diferencaMes = hoje.getMonth() - dataNascimento.getMonth();
  if (diferencaMes < 0 || (diferencaMes === 0 && hoje.getDate() < dataNascimento.getDate())) {
    idade -= 1;
  }
  return Math.max(0, idade);
}

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 11);
}

function somenteNumerosCPF(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 11);
}

function somenteNumerosCEP(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 8);
}

function formatarCPF(cpf?: string | null) {
  if (!cpf) return "—";
  const n = cpf.replace(/\D/g, "");
  if (n.length === 11) {
    return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
  }
  return cpf;
}

function formatarCEP(cep?: string | null) {
  if (!cep) return "—";
  const n = cep.replace(/\D/g, "");
  if (n.length === 8) return `${n.slice(0, 5)}-${n.slice(5)}`;
  return cep;
}

function formatarTelefone(numero?: string | null) {
  if (!numero) return "—";
  const n = numero.replace(/\D/g, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return numero;
}

function formatarData(data?: string | null) {
  if (!data) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function formatarDataHora(data?: string | null) {
  if (!data) return "—";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function normalizarBusca(valor?: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function digitosBusca(valor?: string | null) {
  return (valor ?? "").replace(/\D/g, "");
}
function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function correspondeCampo(campo: string, busca: string) {
  if (!busca) return true;
  const campoNorm = normalizarTexto(campo);
  const buscaNorm = normalizarTexto(busca);

  const campoSemEspaco = campoNorm.replace(/\s+/g, "");
  const buscaSemEspaco = buscaNorm.replace(/\s+/g, "");
  if (campoSemEspaco.includes(buscaSemEspaco)) return true;

  const palavras = buscaNorm.split(/\s+/).filter(Boolean);
  return palavras.length > 0 && palavras.every((palavra) => campoNorm.includes(palavra));
}
function statusDoAluno(aluno: Aluno): StatusAluno {
  return aluno.ativo ? "ativo" : "inativo";
}

function turmaInicialPorNome(turmas: Turma[], nome?: string | null) {
  if (!nome) return SEM_TURMA;
  const turma = turmas.find((item) => item.nome === nome);
  return turma?.id ?? SEM_TURMA;
}

function labelTurma(turma: Turma) {
  const horario =
    turma.horario_inicio && turma.horario_fim
      ? `${turma.horario_inicio.slice(0, 5)} às ${turma.horario_fim.slice(0, 5)}`
      : turma.horario_inicio
        ? turma.horario_inicio.slice(0, 5)
        : "horário não informado";
  const dia = turma.dia_semana ? `${turma.dia_semana} — ` : "";
  return `${turma.nome} (${dia}${horario})`;
}

async function turmaTemVaga(turma: Turma, alunoIdIgnorado?: string) {
  const vagasTotal = Number(turma.vagas_total ?? 0);
  if (vagasTotal <= 0) {
    toast.error(`A turma "${turma.nome}" não possui vagas configuradas.`);
    return false;
  }
  let query = supabase
    .from("alunos_turmas")
    .select("id", { count: "exact", head: true })
    .eq("turma_id", turma.id)
    .eq("ativo", true);
  if (alunoIdIgnorado) query = query.neq("aluno_id", alunoIdIgnorado);
  const { count, error } = await query;
  if (error) {
    console.error(error);
    toast.error(`Erro ao verificar vagas da turma: ${error.message}`);
    return false;
  }
  if ((count ?? 0) >= vagasTotal) {
    toast.error(`A turma "${turma.nome}" está lotada.`);
    return false;
  }
  return true;
}

function AlunosAdmin() {
  const sessao = getSessao();
  const perfil = sessao?.perfil;

  const podeCriar = perfil === "Administrador" || perfil === "Recepção";
  const podeEditar = perfil === "Administrador" || perfil === "Recepção";
  const podeAlterarStatus = perfil === "Administrador" || perfil === "Recepção";
  const podeExcluir = perfil === "Administrador";
  const podeRegistrarOcorrencia = perfil === "Administrador" || perfil === "Recepção";
  const apenasVisualiza = perfil === "Professor";

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [q, setQ] = useState("");
  const [mod, setMod] = useState<"todas" | Modalidade>("todas");
  const [st, setSt] = useState<"todos" | StatusAluno>("todos");
  const [pagina, setPagina] = useState(0);
  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<Aluno | null>(null);
  const [visualizando, setVisualizando] = useState<Aluno | null>(null);

  async function carregarAlunos() {
    const { data, error } = await buscarTodasLinhas<Aluno>("alunos", "*", {
      ordenarPor: "criado_em",
      ascendente: false,
    });
    if (error) {
      console.error(error);
      toast.error(`Erro ao carregar alunos: ${error.message}`);
      return;
    }
    setAlunos(data);
  }

  async function carregarTurmas() {
    const { data, error } = await supabase
      .from("turmas")
      .select(
        "id, nome, modalidade, dia_semana, horario_inicio, horario_fim, professor, vagas_total, ativa",
      )
      .eq("ativa", true)
      .order("horario_inicio", { ascending: true });
    if (error) {
      console.error(error);
      toast.error(`Erro ao carregar turmas: ${error.message}`);
      return;
    }
    setTurmas((data ?? []) as Turma[]);
  }

  async function carregarTudo() {
    setCarregando(true);
    await Promise.all([carregarAlunos(), carregarTurmas()]);
    setCarregando(false);
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  const filtrados = useMemo(() => {
    const busca = q.trim();
    const buscaNumeros = busca.replace(/\D/g, "");
    return alunos.filter((aluno) => {
      const status = statusDoAluno(aluno);
      const passaBusca =
        !busca ||
        correspondeCampo(aluno.nome_completo, busca) ||
        correspondeCampo(aluno.modalidade, busca) ||
        correspondeCampo(aluno.turma ?? "", busca) ||
        correspondeCampo(aluno.responsavel ?? "", busca) ||
        correspondeCampo(aluno.email ?? "", busca) ||
        (buscaNumeros !== "" &&
          (aluno.whatsapp.replace(/\D/g, "").includes(buscaNumeros) ||
            (aluno.telefone ?? "").replace(/\D/g, "").includes(buscaNumeros) ||
            (aluno.cpf ?? "").replace(/\D/g, "").includes(buscaNumeros)));
      const passaModalidade = mod === "todas" || aluno.modalidade === mod;
      const passaStatus = st === "todos" || status === st;
      return passaBusca && passaModalidade && passaStatus;
    });
  }, [alunos, q, mod, st]);
  const TAMANHO_PAGINA = 50;
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANHO_PAGINA));
  const alunosPagina = useMemo(
    () => filtrados.slice(pagina * TAMANHO_PAGINA, (pagina + 1) * TAMANHO_PAGINA),
    [filtrados, pagina],
  );

  useEffect(() => {
    setPagina(0);
  }, [q, mod, st]);
  const totalAlunos = alunos.length;
  const totalAtivos = alunos.filter((a) => a.ativo).length;
  const totalInativos = alunos.filter((a) => !a.ativo).length;

  async function alterarStatus(aluno: Aluno, ativo: boolean) {
    if (!podeAlterarStatus) {
      toast.error("Seu perfil não tem permissão para alterar alunos.");
      return;
    }
    const { error } = await supabase.from("alunos").update({ ativo }).eq("id", aluno.id);
    if (error) {
      console.error(error);
      toast.error(`Erro ao alterar status do aluno: ${error.message}`);
      return;
    }
    setAlunos((lista) => lista.map((item) => (item.id === aluno.id ? { ...item, ativo } : item)));
    toast.success(ativo ? "Aluno ativado." : "Aluno inativado.");
  }

  async function excluirAluno(aluno: Aluno) {
    if (!podeExcluir) {
      toast.error("Apenas a Administração pode excluir alunos.");
      return;
    }
    const confirmado = window.confirm(
      `Tem certeza que deseja excluir "${aluno.nome_completo}"? Essa ação não poderá ser desfeita.`,
    );
    if (!confirmado) return;
    const { error: vinculosError } = await supabase
      .from("alunos_turmas")
      .delete()
      .eq("aluno_id", aluno.id);
    if (vinculosError) {
      console.error(vinculosError);
      toast.error(`Erro ao remover vínculos do aluno: ${vinculosError.message}`);
      return;
    }
    const { error } = await supabase.from("alunos").delete().eq("id", aluno.id);
    if (error) {
      console.error(error);
      toast.error(`Erro ao excluir aluno: ${error.message}`);
      return;
    }
    setAlunos((lista) => lista.filter((item) => item.id !== aluno.id));
    toast.success("Aluno excluído.");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total cadastrado</CardDescription>
            <CardTitle>{totalAlunos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alunos ativos</CardDescription>
            <CardTitle>{totalAtivos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alunos inativos</CardDescription>
            <CardTitle>{totalInativos}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Alunos</CardTitle>
              <CardDescription>
                Gerencie alunos cadastrados, status, vínculo com turmas e ficha administrativa.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={carregarTudo}
                disabled={carregando}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              {podeCriar && (
                <Button type="button" size="sm" onClick={() => setNovoAberto(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo aluno
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {apenasVisualiza && (
            <div className="rounded-md border border-dashed border-border bg-accent/30 px-3 py-2 text-sm text-muted-foreground">
              Perfil de professor: visualização dos alunos disponível. Alterações são restritas à
              Administração e à Recepção.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar aluno, CPF..."
                className="pl-9"
              />
            </div>
            <select
              value={mod}
              onChange={(e) => setMod(e.target.value as "todas" | Modalidade)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="todas">Todas as modalidades</option>
              {modalidades.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={st}
              onChange={(e) => setSt(e.target.value as "todos" | StatusAluno)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunosPagina.map((aluno) => {
                  const status = statusDoAluno(aluno);
                  return (
                    <TableRow key={aluno.id}>
                      <TableCell>
                        <p className="font-medium">{aluno.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{aluno.idade} anos</p>
                      </TableCell>
                      <TableCell>{aluno.modalidade}</TableCell>
                      <TableCell>{aluno.turma || "—"}</TableCell>
                      <TableCell>
                        {aluno.responsavel && (
                          <p className="text-sm font-medium">Resp.: {aluno.responsavel}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          WhatsApp: {formatarTelefone(aluno.whatsapp)}
                        </p>
                        {aluno.telefone && (
                          <p className="text-xs text-muted-foreground">
                            Tel.: {formatarTelefone(aluno.telefone)}
                          </p>
                        )}
                        {aluno.email && (
                          <p className="break-all text-xs text-muted-foreground">
                            E-mail: {aluno.email}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            status === "ativo"
                              ? "border border-green-300 bg-green-50 text-green-700 hover:bg-green-50"
                              : "border border-muted bg-muted text-muted-foreground hover:bg-muted"
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatarData(aluno.criado_em)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setVisualizando(aluno)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar ficha
                            </DropdownMenuItem>
                            {podeEditar && (
                              <DropdownMenuItem onClick={() => setEditando(aluno)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {podeAlterarStatus && (
                              <>
                                <DropdownMenuSeparator />
                                {aluno.ativo ? (
                                  <DropdownMenuItem onClick={() => alterarStatus(aluno, false)}>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Inativar
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => alterarStatus(aluno, true)}>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Ativar
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {podeExcluir && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => excluirAluno(aluno)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {carregando ? "Carregando alunos..." : "Nenhum aluno encontrado."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filtrados.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-xs text-muted-foreground">
                Mostrando {pagina * TAMANHO_PAGINA + 1}–
                {Math.min((pagina + 1) * TAMANHO_PAGINA, filtrados.length)} de {filtrados.length} encontrados
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  disabled={pagina === 0}
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página {pagina + 1} de {totalPaginas}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={pagina >= totalPaginas - 1}
                  onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {podeCriar && (
        <NovoAlunoDialog
          open={novoAberto}
          onOpenChange={setNovoAberto}
          onSaved={carregarTudo}
          turmas={turmas}
        />
      )}
      {podeEditar && editando && (
        <EditarAlunoDialog
          aluno={editando}
          open={!!editando}
          onOpenChange={(open) => {
            if (!open) setEditando(null);
          }}
          onSaved={() => {
            setEditando(null);
            carregarTudo();
          }}
          turmas={turmas}
        />
      )}
      {visualizando && (
        <FichaAlunoDialog
          aluno={visualizando}
          open={!!visualizando}
          onOpenChange={(open) => {
            if (!open) setVisualizando(null);
          }}
          podeRegistrarOcorrencia={podeRegistrarOcorrencia}
          registradoPor={sessao?.nome ?? sessao?.usuario ?? perfil ?? "Equipe"}
        />
      )}
    </div>
  );
}

function FichaAlunoDialog({
  aluno,
  open,
  onOpenChange,
  podeRegistrarOcorrencia,
  registradoPor,
}: {
  aluno: Aluno;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podeRegistrarOcorrencia: boolean;
  registradoPor: string;
}) {
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaAluno[]>([]);
  const [carregandoOcorrencias, setCarregandoOcorrencias] = useState(false);
  const [nova, setNova] = useState({ tipo: "Observação", titulo: "", descricao: "" });

  async function carregarOcorrencias() {
    if (!aluno.id) return;
    setCarregandoOcorrencias(true);
    const { data, error } = await supabase
      .from("ocorrencias_alunos")
      .select("*")
      .eq("aluno_id", aluno.id)
      .order("criado_em", { ascending: false });
    if (error) {
      console.error(error);
      toast.error(`Erro ao carregar ocorrências: ${error.message}`);
      setCarregandoOcorrencias(false);
      return;
    }
    setOcorrencias((data ?? []) as OcorrenciaAluno[]);
    setCarregandoOcorrencias(false);
  }

  useEffect(() => {
    if (open) {
      carregarOcorrencias();
      setNova({ tipo: "Observação", titulo: "", descricao: "" });
    }
  }, [open, aluno.id]);

  async function registrarOcorrencia() {
    if (!podeRegistrarOcorrencia) {
      toast.error("Seu perfil não tem permissão para registrar ocorrências.");
      return;
    }
    if (!nova.titulo.trim()) {
      toast.error("Informe um título para a ocorrência.");
      return;
    }
    if (!nova.descricao.trim()) {
      toast.error("Informe a descrição da ocorrência.");
      return;
    }
    const { error } = await supabase.from("ocorrencias_alunos").insert({
      aluno_id: aluno.id,
      tipo: nova.tipo,
      titulo: nova.titulo.trim(),
      descricao: nova.descricao.trim(),
      registrado_por: registradoPor,
    });
    if (error) {
      console.error(error);
      toast.error(`Erro ao registrar ocorrência: ${error.message}`);
      return;
    }
    toast.success("Ocorrência registrada.");
    setNova({ tipo: "Observação", titulo: "", descricao: "" });
    carregarOcorrencias();
  }

  async function excluirOcorrencia(ocorrencia: OcorrenciaAluno) {
    if (!podeRegistrarOcorrencia) {
      toast.error("Seu perfil não tem permissão para excluir ocorrências.");
      return;
    }
    if (!window.confirm(`Deseja excluir a ocorrência "${ocorrencia.titulo}"?`)) return;
    const { error } = await supabase.from("ocorrencias_alunos").delete().eq("id", ocorrencia.id);
    if (error) {
      console.error(error);
      toast.error(`Erro ao excluir ocorrência: ${error.message}`);
      return;
    }
    toast.success("Ocorrência excluída.");
    carregarOcorrencias();
  }

  const status = statusDoAluno(aluno);
  const enderecoCompleto =
    [aluno.endereco, aluno.complemento, aluno.bairro].filter(Boolean).join(", ") || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Ficha do aluno
          </DialogTitle>
          <DialogDescription>
            Dados cadastrais, contatos, turma atual e histórico administrativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-accent/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-foreground">{aluno.nome_completo}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {aluno.idade} anos · {aluno.modalidade}
                </p>
              </div>
              <Badge
                className={
                  status === "ativo"
                    ? "border border-green-300 bg-green-50 text-green-700 hover:bg-green-50"
                    : "border border-muted bg-muted text-muted-foreground hover:bg-muted"
                }
              >
                {status}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Dados do aluno
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoLinha label="Nascimento" value={formatarData(aluno.nascimento)} />
                <InfoLinha label="Idade" value={`${aluno.idade} anos`} />
                <InfoLinha label="Modalidade" value={aluno.modalidade} />
                <InfoLinha label="Turma atual" value={aluno.turma || "Sem turma"} />
                <InfoLinha label="Cadastrado em" value={formatarData(aluno.criado_em)} />
                {aluno.atestado_validade && (
                  <InfoLinha
                    label="Validade do atestado"
                    value={formatarData(aluno.atestado_validade)}
                  />
                )}
                {aluno.parq_validade && (
                  <InfoLinha label="Validade do PAR-Q" value={formatarData(aluno.parq_validade)} />
                )}
                <InfoLinha label="Nível" value={labelNivel(aluno.nivel)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4 text-primary" />
                  Contato e responsável
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoLinha label="Responsável" value={aluno.responsavel || "Não informado"} />
                <InfoLinha label="WhatsApp" value={formatarTelefone(aluno.whatsapp)} />
                <InfoLinha label="Telefone celular" value={formatarTelefone(aluno.telefone)} />
                <InfoLinha label="Telefone fixo" value={formatarTelefone(aluno.telefone_fixo)} />
                <InfoLinha
                  label="E-mail"
                  value={
                    aluno.email ? <span className="break-all">{aluno.email}</span> : "Não informado"
                  }
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <IdCard className="h-4 w-4 text-primary" />
                  Documentação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoLinha label="CPF" value={formatarCPF(aluno.cpf)} />
                <InfoLinha label="Nome do pai" value={aluno.nome_pai || "Não informado"} />
                <InfoLinha label="Nome da mãe" value={aluno.nome_mae || "Não informado"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoLinha label="Endereço" value={enderecoCompleto || "Não informado"} />
                <InfoLinha label="CEP" value={formatarCEP(aluno.cep)} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" />
                Observações cadastrais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {aluno.observacoes?.trim() || "Nenhuma observação cadastral registrada."}
              </p>
            </CardContent>
          </Card>

          {podeRegistrarOcorrencia && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquarePlus className="h-4 w-4 text-primary" />
                  Registrar ocorrência
                </CardTitle>
                <CardDescription>
                  Adicione um registro administrativo ao histórico do aluno.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                  <Field label="Tipo">
                    <select
                      value={nova.tipo}
                      onChange={(e) => setNova((a) => ({ ...a, tipo: e.target.value }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {tiposOcorrencia.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Título">
                    <Input
                      value={nova.titulo}
                      onChange={(e) => setNova((a) => ({ ...a, titulo: e.target.value }))}
                      placeholder="Ex.: Atestado médico apresentado"
                    />
                  </Field>
                </div>
                <Field label="Descrição">
                  <Textarea
                    value={nova.descricao}
                    onChange={(e) => setNova((a) => ({ ...a, descricao: e.target.value }))}
                    placeholder="Descreva o que aconteceu, orientação dada ou informação relevante."
                  />
                </Field>
                <div className="flex justify-end">
                  <Button type="button" onClick={registrarOcorrencia}>
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    Registrar ocorrência
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                Histórico de ocorrências
              </CardTitle>
              <CardDescription>Registros administrativos associados a este aluno.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {carregandoOcorrencias && (
                <p className="text-sm text-muted-foreground">Carregando ocorrências...</p>
              )}
              {!carregandoOcorrencias && ocorrencias.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma ocorrência registrada para este aluno.
                </p>
              )}
              {ocorrencias.map((ocorrencia) => (
                <div key={ocorrencia.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{ocorrencia.tipo}</Badge>
                        <p className="font-medium text-foreground">{ocorrencia.titulo}</p>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {ocorrencia.descricao}
                      </p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatarDataHora(ocorrencia.criado_em)}
                        {ocorrencia.registrado_por ? ` · ${ocorrencia.registrado_por}` : ""}
                      </p>
                    </div>
                    {podeRegistrarOcorrencia && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => excluirOcorrencia(ocorrencia)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoLinha({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function NovoAlunoDialog({
  open,
  onOpenChange,
  onSaved,
  turmas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  turmas: Turma[];
}) {
  function dataDaquiUmAno(): string {
    const data = new Date();
    data.setFullYear(data.getFullYear() + 1);
    return data.toISOString().slice(0, 10);
  }

  const estadoInicial = {
    nome_completo: "",
    nascimento: "",
    modalidade: "Natação Infantil" as Modalidade,
    turma_id: SEM_TURMA,
    responsavel: "",
    telefone: "",
    telefone_fixo: "",
    whatsapp: "",
    email: "",
    cpf: "",
    endereco: "",
    complemento: "",
    bairro: "",
    cep: "",
    nome_pai: "",
    nome_mae: "",
    atestado_validade: dataDaquiUmAno(),
    parq_validade: dataDaquiUmAno(),
    nivel: "" as Nivel | "",
    observacoes: "",
    ativo: true,
  };

  const [f, setF] = useState(estadoInicial);

  useEffect(() => {
    if (!open) setF(estadoInicial);
  }, [open]);

  const turmasFiltradas = turmas.filter((t) => t.ativa && t.modalidade === f.modalidade);

  async function submit() {
    if (!f.nome_completo.trim()) {
      toast.error("Informe o nome completo.");
      return;
    }
    if (!f.nascimento) {
      toast.error("Informe a data de nascimento.");
      return;
    }
    if (!f.whatsapp.trim() || f.whatsapp.trim().length < 10) {
      toast.error("Informe um WhatsApp válido com DDD.");
      return;
    }

    const turmaSelecionada =
      f.turma_id === SEM_TURMA ? null : (turmas.find((t) => t.id === f.turma_id) ?? null);
    if (turmaSelecionada) {
      const temVaga = await turmaTemVaga(turmaSelecionada);
      if (!temVaga) return;
    }

    const { data: alunoCriado, error } = await supabase
      .from("alunos")
      .insert({
        nome_completo: f.nome_completo.trim(),
        nascimento: f.nascimento,
        idade: calcIdade(f.nascimento),
        modalidade: f.modalidade,
        turma: turmaSelecionada?.nome ?? null,
        responsavel: f.responsavel.trim() || null,
        telefone: f.telefone.trim() || null,
        telefone_fixo: f.telefone_fixo.trim() || null,
        whatsapp: f.whatsapp.trim(),
        email: f.email.trim() || null,
        cpf: f.cpf.trim() || null,
        endereco: f.endereco.trim() || null,
        complemento: f.complemento.trim() || null,
        bairro: f.bairro.trim() || null,
        cep: f.cep.trim() || null,
        nome_pai: f.nome_pai.trim() || null,
        nome_mae: f.nome_mae.trim() || null,
        atestado_validade: f.atestado_validade || null,
        parq_validade: f.parq_validade || null,
        nivel: f.nivel || null,
        observacoes: f.observacoes.trim() || null,
        ativo: f.ativo,
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      toast.error(`Erro ao cadastrar aluno: ${error.message}`);
      return;
    }

    if (turmaSelecionada && alunoCriado?.id) {
      const { error: vinculoError } = await supabase
        .from("alunos_turmas")
        .insert({ aluno_id: alunoCriado.id, turma_id: turmaSelecionada.id, ativo: true });
      if (vinculoError) {
        console.error(vinculoError);
        toast.error(`Aluno cadastrado, mas houve erro ao vincular turma: ${vinculoError.message}`);
        onOpenChange(false);
        onSaved();
        return;
      }
    }

    toast.success("Aluno cadastrado.");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo aluno</DialogTitle>
          <DialogDescription>
            Cadastre um aluno manualmente e vincule a uma turma, se necessário.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo">
              <Input
                value={f.nome_completo}
                onChange={(e) => setF((a) => ({ ...a, nome_completo: e.target.value }))}
                placeholder="Nome do aluno"
              />
            </Field>
            <Field label="Data de nascimento">
              <Input
                type="date"
                value={f.nascimento}
                onChange={(e) => setF((a) => ({ ...a, nascimento: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CPF">
              <Input
                value={f.cpf}
                onChange={(e) => setF((a) => ({ ...a, cpf: somenteNumerosCPF(e.target.value) }))}
                placeholder="Somente números"
                maxLength={11}
              />
            </Field>
            <Field label="Validade do atestado médico">
              <Input
                type="date"
                value={f.atestado_validade}
                onChange={(e) => setF((a) => ({ ...a, atestado_validade: e.target.value }))}
              />
              <span className="text-xs font-normal text-muted-foreground">
                Sugestão: 1 ano a partir de hoje. Ajuste se o atestado indicar outra data.
              </span>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Validade do PAR-Q">
              <Input
                type="date"
                value={f.parq_validade}
                onChange={(e) => setF((a) => ({ ...a, parq_validade: e.target.value }))}
              />
            </Field>
            <Field label="Nível (opcional)">
              <select
                value={f.nivel}
                onChange={(e) => setF((a) => ({ ...a, nivel: e.target.value as Nivel | "" }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Não avaliado</option>
                {niveis.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Modalidade">
              <select
                value={f.modalidade}
                onChange={(e) =>
                  setF((a) => ({
                    ...a,
                    modalidade: e.target.value as Modalidade,
                    turma_id: SEM_TURMA,
                  }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {modalidades.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Turma">
              <select
                value={f.turma_id}
                onChange={(e) => setF((a) => ({ ...a, turma_id: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={SEM_TURMA}>Sem turma</option>
                {turmasFiltradas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {labelTurma(t)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Responsável">
              <Input
                value={f.responsavel}
                onChange={(e) => setF((a) => ({ ...a, responsavel: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={f.whatsapp}
                onChange={(e) => setF((a) => ({ ...a, whatsapp: somenteNumeros(e.target.value) }))}
                placeholder="DDD + número"
                maxLength={11}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Telefone celular">
              <Input
                value={f.telefone}
                onChange={(e) => setF((a) => ({ ...a, telefone: somenteNumeros(e.target.value) }))}
                placeholder="Opcional"
                maxLength={11}
              />
            </Field>
            <Field label="Telefone fixo">
              <Input
                value={f.telefone_fixo}
                onChange={(e) =>
                  setF((a) => ({ ...a, telefone_fixo: somenteNumeros(e.target.value) }))
                }
                placeholder="Opcional"
                maxLength={10}
              />
            </Field>
          </div>

          <Field label="E-mail">
            <Input
              type="email"
              value={f.email}
              onChange={(e) => setF((a) => ({ ...a, email: e.target.value }))}
              placeholder="Opcional"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do pai">
              <Input
                value={f.nome_pai}
                onChange={(e) => setF((a) => ({ ...a, nome_pai: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
            <Field label="Nome da mãe">
              <Input
                value={f.nome_mae}
                onChange={(e) => setF((a) => ({ ...a, nome_mae: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Endereço">
              <Input
                value={f.endereco}
                onChange={(e) => setF((a) => ({ ...a, endereco: e.target.value }))}
                placeholder="Rua, número"
              />
            </Field>
            <Field label="Complemento">
              <Input
                value={f.complemento}
                onChange={(e) => setF((a) => ({ ...a, complemento: e.target.value }))}
                placeholder="Apto, casa..."
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bairro">
              <Input
                value={f.bairro}
                onChange={(e) => setF((a) => ({ ...a, bairro: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
            <Field label="CEP">
              <Input
                value={f.cep}
                onChange={(e) => setF((a) => ({ ...a, cep: somenteNumerosCEP(e.target.value) }))}
                placeholder="Somente números"
                maxLength={8}
              />
            </Field>
          </div>

          <Field label="Observações">
            <Textarea
              value={f.observacoes}
              onChange={(e) => setF((a) => ({ ...a, observacoes: e.target.value }))}
              placeholder="Enfermidades, limitações, medicações ou outras informações importantes"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={f.ativo}
              onChange={(e) => setF((a) => ({ ...a, ativo: e.target.checked }))}
            />
            Aluno ativo
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={submit}>
              Salvar aluno
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditarAlunoDialog({
  aluno,
  open,
  onOpenChange,
  onSaved,
  turmas,
}: {
  aluno: Aluno;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  turmas: Turma[];
}) {
  const [f, setF] = useState(() => ({
    nome_completo: aluno.nome_completo ?? "",
    nascimento: aluno.nascimento?.slice(0, 10) ?? "",
    modalidade: aluno.modalidade as Modalidade,
    turma_id: turmaInicialPorNome(turmas, aluno.turma),
    responsavel: aluno.responsavel ?? "",
    telefone: aluno.telefone ?? "",
    telefone_fixo: aluno.telefone_fixo ?? "",
    whatsapp: aluno.whatsapp ?? "",
    email: aluno.email ?? "",
    cpf: aluno.cpf ?? "",
    endereco: aluno.endereco ?? "",
    complemento: aluno.complemento ?? "",
    bairro: aluno.bairro ?? "",
    cep: aluno.cep ?? "",
    nome_pai: aluno.nome_pai ?? "",
    nome_mae: aluno.nome_mae ?? "",
    atestado_validade: aluno.atestado_validade?.slice(0, 10) ?? "",
    parq_validade: aluno.parq_validade?.slice(0, 10) ?? "",
    nivel: (aluno.nivel ?? "") as Nivel | "",
    observacoes: aluno.observacoes ?? "",
    ativo: aluno.ativo,
  }));

  useEffect(() => {
    if (open) {
      setF({
        nome_completo: aluno.nome_completo ?? "",
        nascimento: aluno.nascimento?.slice(0, 10) ?? "",
        modalidade: aluno.modalidade as Modalidade,
        turma_id: turmaInicialPorNome(turmas, aluno.turma),
        responsavel: aluno.responsavel ?? "",
        telefone: aluno.telefone ?? "",
        telefone_fixo: aluno.telefone_fixo ?? "",
        whatsapp: aluno.whatsapp ?? "",
        email: aluno.email ?? "",
        cpf: aluno.cpf ?? "",
        endereco: aluno.endereco ?? "",
        complemento: aluno.complemento ?? "",
        bairro: aluno.bairro ?? "",
        cep: aluno.cep ?? "",
        nome_pai: aluno.nome_pai ?? "",
        nome_mae: aluno.nome_mae ?? "",
        atestado_validade: aluno.atestado_validade?.slice(0, 10) ?? "",
        parq_validade: aluno.parq_validade?.slice(0, 10) ?? "",
        nivel: (aluno.nivel ?? "") as Nivel | "",
        observacoes: aluno.observacoes ?? "",
        ativo: aluno.ativo,
      });
    }
  }, [open, aluno, turmas]);

  const turmasFiltradas = turmas.filter((t) => t.ativa && t.modalidade === f.modalidade);

  async function save() {
    if (!f.nome_completo.trim()) {
      toast.error("Informe o nome completo.");
      return;
    }
    if (!f.nascimento) {
      toast.error("Informe a data de nascimento.");
      return;
    }
    if (!f.whatsapp.trim() || f.whatsapp.trim().length < 10) {
      toast.error("Informe um WhatsApp válido com DDD.");
      return;
    }

    const turmaSelecionada =
      f.turma_id === SEM_TURMA ? null : (turmas.find((t) => t.id === f.turma_id) ?? null);
    if (turmaSelecionada) {
      const temVaga = await turmaTemVaga(turmaSelecionada, aluno.id);
      if (!temVaga) return;
    }

    const { error } = await supabase
      .from("alunos")
      .update({
        nome_completo: f.nome_completo.trim(),
        nascimento: f.nascimento,
        idade: calcIdade(f.nascimento),
        modalidade: f.modalidade,
        turma: turmaSelecionada?.nome ?? null,
        responsavel: f.responsavel.trim() || null,
        telefone: f.telefone.trim() || null,
        telefone_fixo: f.telefone_fixo.trim() || null,
        whatsapp: f.whatsapp.trim(),
        email: f.email.trim() || null,
        cpf: f.cpf.trim() || null,
        endereco: f.endereco.trim() || null,
        complemento: f.complemento.trim() || null,
        bairro: f.bairro.trim() || null,
        cep: f.cep.trim() || null,
        nome_pai: f.nome_pai.trim() || null,
        nome_mae: f.nome_mae.trim() || null,
        atestado_validade: f.atestado_validade || null,
        parq_validade: f.parq_validade || null,
        nivel: f.nivel || null,
        observacoes: f.observacoes.trim() || null,
        ativo: f.ativo,
      })
      .eq("id", aluno.id);

    if (error) {
      console.error(error);
      toast.error(`Erro ao atualizar aluno: ${error.message}`);
      return;
    }

    const { error: removerVinculosError } = await supabase
      .from("alunos_turmas")
      .delete()
      .eq("aluno_id", aluno.id);
    if (removerVinculosError) {
      console.error(removerVinculosError);
      toast.error(
        `Aluno atualizado, mas houve erro ao remover vínculo anterior: ${removerVinculosError.message}`,
      );
      onSaved();
      return;
    }

    if (turmaSelecionada) {
      const { error: vinculoError } = await supabase
        .from("alunos_turmas")
        .insert({ aluno_id: aluno.id, turma_id: turmaSelecionada.id, ativo: true });
      if (vinculoError) {
        console.error(vinculoError);
        toast.error(`Aluno atualizado, mas houve erro ao vincular turma: ${vinculoError.message}`);
        onSaved();
        return;
      }
    }

    toast.success("Aluno atualizado.");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar aluno</DialogTitle>
          <DialogDescription>Atualize os dados do aluno e o vínculo com a turma.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo">
              <Input
                value={f.nome_completo}
                onChange={(e) => setF((a) => ({ ...a, nome_completo: e.target.value }))}
              />
            </Field>
            <Field label="Data de nascimento">
              <Input
                type="date"
                value={f.nascimento}
                onChange={(e) => setF((a) => ({ ...a, nascimento: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CPF">
              <Input
                value={f.cpf}
                onChange={(e) => setF((a) => ({ ...a, cpf: somenteNumerosCPF(e.target.value) }))}
                placeholder="Somente números"
                maxLength={11}
              />
            </Field>
            <Field label="Validade do atestado médico">
              <Input
                type="date"
                value={f.atestado_validade}
                onChange={(e) => setF((a) => ({ ...a, atestado_validade: e.target.value }))}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Validade do PAR-Q">
              <Input
                type="date"
                value={f.parq_validade}
                onChange={(e) => setF((a) => ({ ...a, parq_validade: e.target.value }))}
              />
            </Field>
            <Field label="Nível (opcional)">
              <select
                value={f.nivel}
                onChange={(e) => setF((a) => ({ ...a, nivel: e.target.value as Nivel | "" }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Não avaliado</option>
                {niveis.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Modalidade">
              <select
                value={f.modalidade}
                onChange={(e) =>
                  setF((a) => ({
                    ...a,
                    modalidade: e.target.value as Modalidade,
                    turma_id: SEM_TURMA,
                  }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {modalidades.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Turma">
              <select
                value={f.turma_id}
                onChange={(e) => setF((a) => ({ ...a, turma_id: e.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={SEM_TURMA}>Sem turma</option>
                {turmasFiltradas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {labelTurma(t)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Responsável">
              <Input
                value={f.responsavel}
                onChange={(e) => setF((a) => ({ ...a, responsavel: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={f.whatsapp}
                onChange={(e) => setF((a) => ({ ...a, whatsapp: somenteNumeros(e.target.value) }))}
                maxLength={11}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Telefone celular">
              <Input
                value={f.telefone}
                onChange={(e) => setF((a) => ({ ...a, telefone: somenteNumeros(e.target.value) }))}
                placeholder="Opcional"
                maxLength={11}
              />
            </Field>
            <Field label="Telefone fixo">
              <Input
                value={f.telefone_fixo}
                onChange={(e) =>
                  setF((a) => ({ ...a, telefone_fixo: somenteNumeros(e.target.value) }))
                }
                placeholder="Opcional"
                maxLength={10}
              />
            </Field>
          </div>

          <Field label="E-mail">
            <Input
              type="email"
              value={f.email}
              onChange={(e) => setF((a) => ({ ...a, email: e.target.value }))}
              placeholder="Opcional"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do pai">
              <Input
                value={f.nome_pai}
                onChange={(e) => setF((a) => ({ ...a, nome_pai: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
            <Field label="Nome da mãe">
              <Input
                value={f.nome_mae}
                onChange={(e) => setF((a) => ({ ...a, nome_mae: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Endereço">
              <Input
                value={f.endereco}
                onChange={(e) => setF((a) => ({ ...a, endereco: e.target.value }))}
                placeholder="Rua, número"
              />
            </Field>
            <Field label="Complemento">
              <Input
                value={f.complemento}
                onChange={(e) => setF((a) => ({ ...a, complemento: e.target.value }))}
                placeholder="Apto, casa..."
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bairro">
              <Input
                value={f.bairro}
                onChange={(e) => setF((a) => ({ ...a, bairro: e.target.value }))}
                placeholder="Opcional"
              />
            </Field>
            <Field label="CEP">
              <Input
                value={f.cep}
                onChange={(e) => setF((a) => ({ ...a, cep: somenteNumerosCEP(e.target.value) }))}
                placeholder="Somente números"
                maxLength={8}
              />
            </Field>
          </div>

          <Field label="Observações">
            <Textarea
              value={f.observacoes}
              onChange={(e) => setF((a) => ({ ...a, observacoes: e.target.value }))}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={f.ativo}
              onChange={(e) => setF((a) => ({ ...a, ativo: e.target.checked }))}
            />
            Aluno ativo
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={save}>
              Salvar alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
