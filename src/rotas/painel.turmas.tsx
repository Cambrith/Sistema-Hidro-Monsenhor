import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { supabase } from "@/utilitarios/supabase";
import { getSessao } from "@/utilitarios/autenticacao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Input } from "@/componentes/ui/input";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";
import { Label } from "@/componentes/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/componentes/ui/dropdown-menu";
import {
  Plus,
  Search,
  Pencil,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  MinusCircle,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/turmas")({
  head: () => ({ meta: [{ title: "Turmas" }] }),
  component: TurmasAdmin,
});

type Modalidade = "Natação Infantil" | "Natação Adulta" | "Hidroginástica";
type StatusTurma = "ativa" | "inativa";

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
  criado_em: string;
};

type AlunoTurma = {
  id: string;
  aluno_id: string;
  turma_id: string;
  ativo: boolean;
};

type FormTurma = {
  nome: string;
  modalidade: Modalidade;
  dia_semana: string;
  horario_inicio: string;
  horario_fim: string;
  professor: string;
  vagas_total: number;
  ativa: boolean;
};

const statusColors: Record<StatusTurma, string> = {
  ativa: "bg-success/15 text-success border-success/40",
  inativa: "bg-muted text-muted-foreground border-border",
};

const formInicial: FormTurma = {
  nome: "",
  modalidade: "Natação Infantil",
  dia_semana: "",
  horario_inicio: "",
  horario_fim: "",
  professor: "",
  vagas_total: 12,
  ativa: true,
};

function statusDaTurma(turma: Turma): StatusTurma {
  return turma.ativa ? "ativa" : "inativa";
}

function formatarHorario(inicio?: string | null, fim?: string | null) {
  if (!inicio && !fim) return "—";

  const i = inicio ? inicio.slice(0, 5) : "";
  const f = fim ? fim.slice(0, 5) : "";

  if (i && f) return `${i} às ${f}`;

  return i || f || "—";
}

function turmaParaForm(turma: Turma): FormTurma {
  return {
    nome: turma.nome,
    modalidade: turma.modalidade as Modalidade,
    dia_semana: turma.dia_semana ?? "",
    horario_inicio: turma.horario_inicio?.slice(0, 5) ?? "",
    horario_fim: turma.horario_fim?.slice(0, 5) ?? "",
    professor: turma.professor ?? "",
    vagas_total: turma.vagas_total ?? 0,
    ativa: turma.ativa,
  };
}

function TurmasAdmin() {
  const sessao = getSessao();
  const perfil = sessao?.perfil;

  const podeCriar = perfil === "Administrador" || perfil === "Recepção";
  const podeEditar = perfil === "Administrador" || perfil === "Recepção";
  const podeAlterarStatus = perfil === "Administrador" || perfil === "Recepção";
  const podeExcluir = perfil === "Administrador";

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);

  const [q, setQ] = useState("");
  const [mod, setMod] = useState<"todas" | Modalidade>("todas");
  const [st, setSt] = useState<"todos" | StatusTurma>("todos");

  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<Turma | null>(null);

  async function carregarContagens() {
    const { data, error } = await supabase
      .from("alunos_turmas")
      .select("id, aluno_id, turma_id, ativo")
      .eq("ativo", true);

    if (error) {
      console.error(error);
      toast.error(`Erro ao carregar inscritos por turma: ${error.message}`);
      return;
    }

    const mapa: Record<string, number> = {};

    ((data ?? []) as AlunoTurma[]).forEach((vinculo) => {
      mapa[vinculo.turma_id] = (mapa[vinculo.turma_id] ?? 0) + 1;
    });

    setContagens(mapa);
  }

  async function carregar() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("turmas")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error(error);
      toast.error(`Erro ao carregar turmas: ${error.message}`);
      setCarregando(false);
      return;
    }

    setTurmas((data ?? []) as Turma[]);
    await carregarContagens();
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alterarStatus(turma: Turma, ativa: boolean) {
    if (!podeAlterarStatus) {
      toast.error("Seu perfil não tem permissão para alterar turmas.");
      return;
    }

    const { error } = await supabase.from("turmas").update({ ativa }).eq("id", turma.id);

    if (error) {
      console.error(error);
      toast.error(`Erro ao alterar status: ${error.message}`);
      return;
    }

    setTurmas((lista) => lista.map((t) => (t.id === turma.id ? { ...t, ativa } : t)));

    toast.success(ativa ? "Turma ativada." : "Turma inativada.");
  }

  async function excluirTurma(turma: Turma) {
    if (!podeExcluir) {
      toast.error("Somente a Administração pode excluir turmas.");
      return;
    }

    const inscritos = contagens[turma.id] ?? 0;

    if (inscritos > 0) {
      toast.error("Não é recomendado excluir uma turma com alunos vinculados. Inative a turma.");
      return;
    }

    const confirmado = window.confirm(
      `Tem certeza que deseja excluir "${turma.nome}"? Essa ação não poderá ser desfeita.`,
    );

    if (!confirmado) return;

    const { error } = await supabase.from("turmas").delete().eq("id", turma.id);

    if (error) {
      console.error(error);
      toast.error(`Erro ao excluir turma: ${error.message}`);
      return;
    }

    setTurmas((lista) => lista.filter((t) => t.id !== turma.id));
    toast.success("Turma excluída.");
  }

  const list = useMemo(() => {
    const busca = q.trim().toLowerCase();

    return turmas.filter((t) => {
      const status = statusDaTurma(t);

      const passaBusca =
        !busca ||
        t.nome.toLowerCase().includes(busca) ||
        t.modalidade.toLowerCase().includes(busca) ||
        (t.dia_semana ?? "").toLowerCase().includes(busca) ||
        (t.professor ?? "").toLowerCase().includes(busca);

      const passaModalidade = mod === "todas" || t.modalidade === mod;
      const passaStatus = st === "todos" || status === st;

      return passaBusca && passaModalidade && passaStatus;
    });
  }, [turmas, q, mod, st]);

  const resumo = useMemo(() => {
    const ativas = turmas.filter((t) => t.ativa).length;
    const vagas = turmas.reduce((acc, t) => acc + (t.vagas_total || 0), 0);
    const inscritos = Object.values(contagens).reduce((acc, n) => acc + n, 0);
    const restantes = vagas > 0 ? Math.max(0, vagas - inscritos) : 0;

    return { ativas, vagas, inscritos, restantes };
  }, [turmas, contagens]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Turmas cadastradas</CardTitle>
            <CardDescription>
              {carregando
                ? "Carregando turmas..."
                : `${turmas.length} turma(s) no total. ${resumo.ativas} ativa(s). ${resumo.inscritos}/${resumo.vagas} vaga(s) ocupada(s). ${resumo.restantes} vaga(s) restante(s).`}
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={carregar}
              disabled={carregando}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>

            {podeCriar && (
              <Button type="button" onClick={() => setNovoAberto(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova turma
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {perfil === "Professor" && (
            <div className="rounded-md border border-dashed border-border bg-accent/30 px-3 py-2 text-sm text-muted-foreground">
              Perfil de professor: visualização das turmas disponível. Alterações são restritas à
              Administração e à Recepção.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar turma"
                className="pl-9"
              />
            </div>

            <Select value={mod} onValueChange={(v) => setMod(v as "todas" | Modalidade)}>
              <SelectTrigger>
                <SelectValue placeholder="Modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as modalidades</SelectItem>
                <SelectItem value="Natação Infantil">Natação Infantil</SelectItem>
                <SelectItem value="Natação Adulta">Natação Adulta</SelectItem>
                <SelectItem value="Hidroginástica">Hidroginástica</SelectItem>
              </SelectContent>
            </Select>

            <Select value={st} onValueChange={(v) => setSt(v as "todos" | StatusTurma)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Inscritos/Vagas</TableHead>
                  <TableHead>Restantes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {list.map((t) => {
                  const status = statusDaTurma(t);
                  const inscritos = contagens[t.id] ?? 0;
                  const vagas = t.vagas_total ?? 0;
                  const restantes = Math.max(0, vagas - inscritos);
                  const lotada = vagas > 0 && inscritos >= vagas;

                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.nome}</TableCell>
                      <TableCell>{t.modalidade}</TableCell>
                      <TableCell>{t.dia_semana || "—"}</TableCell>
                      <TableCell>{formatarHorario(t.horario_inicio, t.horario_fim)}</TableCell>
                      <TableCell>{t.professor || "—"}</TableCell>

                      <TableCell>
                        <span className="font-medium">
                          {inscritos}/{vagas}
                        </span>
                      </TableCell>

                      <TableCell>
                        {lotada ? (
                          <Badge variant="destructive">Lotada</Badge>
                        ) : (
                          <span>{restantes}</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${statusColors[status]}`}>
                          {status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {podeEditar || podeAlterarStatus || podeExcluir ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              {podeEditar && (
                                <DropdownMenuItem onClick={() => setEditando(t)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              )}

                              {podeAlterarStatus && (
                                <>
                                  {podeEditar && <DropdownMenuSeparator />}

                                  {t.ativa ? (
                                    <DropdownMenuItem onClick={() => alterarStatus(t, false)}>
                                      <MinusCircle className="mr-2 h-4 w-4" />
                                      Inativar
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      className="text-success focus:text-success"
                                      onClick={() => alterarStatus(t, true)}
                                    >
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
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
                                    onClick={() => excluirTurma(t)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="inline-flex items-center justify-end text-xs text-muted-foreground">
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            Visualizar
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {list.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {carregando ? "Carregando turmas..." : "Nenhuma turma encontrada."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {podeCriar && (
        <NovaTurmaDialog open={novoAberto} onOpenChange={setNovoAberto} onSaved={carregar} />
      )}

      {podeEditar && editando && (
        <EditarTurmaDialog
          turma={editando}
          open={!!editando}
          onOpenChange={(open) => {
            if (!open) setEditando(null);
          }}
          onSaved={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function NovaTurmaDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<FormTurma>(formInicial);

  useEffect(() => {
    if (open) {
      setF(formInicial);
    }
  }, [open]);

  async function submit() {
    if (!f.nome.trim()) {
      toast.error("Informe o nome da turma.");
      return;
    }

    const { error } = await supabase.from("turmas").insert({
      nome: f.nome.trim(),
      modalidade: f.modalidade,
      dia_semana: f.dia_semana.trim() || null,
      horario_inicio: f.horario_inicio || null,
      horario_fim: f.horario_fim || null,
      professor: f.professor.trim() || null,
      vagas_total: Number(f.vagas_total) || 0,
      ativa: f.ativa,
    });

    if (error) {
      console.error(error);
      toast.error(`Erro ao cadastrar turma: ${error.message}`);
      return;
    }

    toast.success("Turma cadastrada.");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova turma</DialogTitle>
          <DialogDescription>
            Cadastro de horários, vagas e professor responsável.
          </DialogDescription>
        </DialogHeader>

        <FormularioTurma f={f} setF={setF} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditarTurmaDialog({
  turma,
  open,
  onOpenChange,
  onSaved,
}: {
  turma: Turma;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<FormTurma>(() => turmaParaForm(turma));

  useEffect(() => {
    if (open) {
      setF(turmaParaForm(turma));
    }
  }, [open, turma.id]);

  async function save() {
    if (!f.nome.trim()) {
      toast.error("Informe o nome da turma.");
      return;
    }

    const { error } = await supabase
      .from("turmas")
      .update({
        nome: f.nome.trim(),
        modalidade: f.modalidade,
        dia_semana: f.dia_semana.trim() || null,
        horario_inicio: f.horario_inicio || null,
        horario_fim: f.horario_fim || null,
        professor: f.professor.trim() || null,
        vagas_total: Number(f.vagas_total) || 0,
        ativa: f.ativa,
      })
      .eq("id", turma.id);

    if (error) {
      console.error(error);
      toast.error(`Erro ao atualizar turma: ${error.message}`);
      return;
    }

    toast.success("Turma atualizada.");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar turma</DialogTitle>
          <DialogDescription>Atualizar dados da turma cadastrada.</DialogDescription>
        </DialogHeader>

        <FormularioTurma f={f} setF={setF} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormularioTurma({ f, setF }: { f: FormTurma; setF: Dispatch<SetStateAction<FormTurma>> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Fld label="Nome da turma *">
        <Input
          value={f.nome}
          onChange={(e) => setF((atual) => ({ ...atual, nome: e.target.value }))}
          placeholder="Ex.: Infantil — Terça 08:00"
        />
      </Fld>

      <Fld label="Modalidade">
        <Select
          value={f.modalidade}
          onValueChange={(v) => setF((atual) => ({ ...atual, modalidade: v as Modalidade }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Natação Infantil">Natação Infantil</SelectItem>
            <SelectItem value="Natação Adulta">Natação Adulta</SelectItem>
            <SelectItem value="Hidroginástica">Hidroginástica</SelectItem>
          </SelectContent>
        </Select>
      </Fld>

      <Fld label="Dia(s) da semana">
        <Input
          value={f.dia_semana}
          onChange={(e) => setF((atual) => ({ ...atual, dia_semana: e.target.value }))}
          placeholder="Ex.: Terças e quintas"
        />
      </Fld>

      <Fld label="Professor">
        <Input
          value={f.professor}
          onChange={(e) => setF((atual) => ({ ...atual, professor: e.target.value }))}
          placeholder="Ex.: Equipe de Educação Física"
        />
      </Fld>

      <Fld label="Horário de início">
        <Input
          type="time"
          value={f.horario_inicio}
          onChange={(e) => setF((atual) => ({ ...atual, horario_inicio: e.target.value }))}
        />
      </Fld>

      <Fld label="Horário de fim">
        <Input
          type="time"
          value={f.horario_fim}
          onChange={(e) => setF((atual) => ({ ...atual, horario_fim: e.target.value }))}
        />
      </Fld>

      <Fld label="Vagas">
        <Input
          type="number"
          min={0}
          value={f.vagas_total}
          onChange={(e) =>
            setF((atual) => ({
              ...atual,
              vagas_total: Number(e.target.value),
            }))
          }
        />
      </Fld>

      <Fld label="Status">
        <Select
          value={f.ativa ? "ativa" : "inativa"}
          onValueChange={(v) => setF((atual) => ({ ...atual, ativa: v === "ativa" }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="inativa">Inativa</SelectItem>
          </SelectContent>
        </Select>
      </Fld>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
