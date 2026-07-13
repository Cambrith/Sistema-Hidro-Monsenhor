import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { getSessao } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  EyeIcon,
  Hourglass,
  MinusCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/pre-cadastros")({
  head: () => ({ meta: [{ title: "Lista de Espera" }] }),
  component: ListaEsperaAdmin,
});

type Modalidade = "Natação Infantil" | "Natação Adulta" | "Hidroginástica";

type StatusListaEspera = "pendente" | "aprovado" | "fila de espera" | "recusado" | "inativo";

type ItemListaEspera = {
  id: string;
  nome_aluno: string;
  nascimento: string;
  idade: number;
  modalidade: string;
  turno: string | null;
  horario_interesse: string | null;
  escola_turma: string | null;
  observacoes: string | null;
  responsavel: string | null;
  telefone: string | null;
  whatsapp: string;
  email: string | null;
  status: StatusListaEspera;
  criado_em: string;
  created_at: string;
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

const SEM_TURMA = "__sem_turma__";

const modalidades: Modalidade[] = ["Natação Infantil", "Natação Adulta", "Hidroginástica"];

const statusStyle: Record<StatusListaEspera, string> = {
  pendente: "border border-yellow-300 bg-yellow-50 text-yellow-800",
  aprovado: "border border-green-300 bg-green-50 text-green-700",
  "fila de espera": "border border-blue-300 bg-blue-50 text-blue-700",
  recusado: "border border-red-300 bg-red-50 text-red-700",
  inativo: "border border-muted bg-muted text-muted-foreground",
};

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

function formatarTelefone(numero?: string | null) {
  if (!numero) return "—";

  const n = numero.replace(/\D/g, "");

  if (n.length === 11) {
    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  }

  if (n.length === 10) {
    return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  }

  return numero;
}

function formatarData(data?: string | null) {
  if (!data) return "—";

  const d = new Date(data);

  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("pt-BR");
}

function separarEscolaTurma(valor?: string | null) {
  if (!valor) return null;

  const partes = valor
    .split("—")
    .map((parte) => parte.trim())
    .filter(Boolean);

  return {
    escola: partes[0] || null,
    anoSerie: partes[1] || null,
    turma: partes[2] || null,
  };
}

function normalizarTexto(valor?: string | null) {
  return (valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function extrairHora(valor?: string | null) {
  const texto = valor ?? "";
  const match = texto.match(/(\d{1,2}):(\d{2})/);

  if (!match) return null;

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function textoTurma(turma: Turma) {
  return normalizarTexto(
    `${turma.nome} ${turma.modalidade} ${turma.dia_semana ?? ""} ${
      turma.horario_inicio ?? ""
    } ${turma.horario_fim ?? ""}`,
  );
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

function encontrarTurmaDoItem(item: ItemListaEspera, turmas: Turma[]) {
  const modalidadeItem = normalizarTexto(item.modalidade);
  const textoItem = normalizarTexto(`${item.horario_interesse ?? ""} ${item.turno ?? ""}`);
  const horaItem = extrairHora(item.horario_interesse || item.turno);

  const turmasDaModalidade = turmas.filter(
    (turma) => turma.ativa && normalizarTexto(turma.modalidade) === modalidadeItem,
  );

  if (turmasDaModalidade.length === 0) return null;

  if (horaItem) {
    const porHora = turmasDaModalidade.filter(
      (turma) => turma.horario_inicio?.slice(0, 5) === horaItem,
    );

    if (porHora.length === 1) return porHora[0];

    if (porHora.length > 1) {
      const porTexto = porHora.find((turma) => {
        const texto = textoTurma(turma);
        return textoItem.includes(texto) || texto.includes(textoItem);
      });

      return porTexto ?? porHora[0];
    }
  }

  const porTexto = turmasDaModalidade.find((turma) => {
    const texto = textoTurma(turma);
    return textoItem.includes(texto) || texto.includes(textoItem);
  });

  return porTexto ?? null;
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

  if (alunoIdIgnorado) {
    query = query.neq("aluno_id", alunoIdIgnorado);
  }

  const { count, error } = await query;

  if (error) {
    console.error(error);
    toast.error(`Erro ao verificar vagas da turma: ${error.message}`);
    return false;
  }

  const ocupados = count ?? 0;

  if (ocupados >= vagasTotal) {
    toast.error(`A turma "${turma.nome}" está lotada.`);
    return false;
  }

  return true;
}

function ListaEsperaAdmin() {
  const sessao = getSessao();
  const perfil = sessao?.perfil;

  const podeAnalisar = perfil === "Administrador" || perfil === "Recepção";
  const podeConverter = perfil === "Administrador" || perfil === "Recepção";
  const podeExcluir = perfil === "Administrador";
  const podeAdicionar = perfil === "Administrador" || perfil === "Recepção";
  const apenasVisualiza = perfil === "Professor";

  const [itens, setItens] = useState<ItemListaEspera[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | StatusListaEspera>("fila de espera");
  const [verId, setVerId] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);

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

  async function carregarListaEspera() {
    const { data, error } = await supabase
      .from("lista_espera")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error(`Erro ao carregar lista de espera: ${error.message}`);
      return;
    }

    setItens((data ?? []) as ItemListaEspera[]);
  }

  async function carregarTudo() {
    setCarregando(true);
    await Promise.all([carregarListaEspera(), carregarTurmas()]);
    setCarregando(false);
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  const filtrados = useMemo(() => {
    const busca = q.trim().toLowerCase();

    return itens.filter((item) => {
      const passaFiltro = filtro === "todos" || item.status === filtro;

      const passaBusca =
        !busca ||
        item.nome_aluno.toLowerCase().includes(busca) ||
        (item.responsavel ?? "").toLowerCase().includes(busca) ||
        item.whatsapp.toLowerCase().includes(busca) ||
        (item.telefone ?? "").toLowerCase().includes(busca) ||
        (item.email ?? "").toLowerCase().includes(busca);

      return passaFiltro && passaBusca;
    });
  }, [itens, q, filtro]);

  const verItem = itens.find((item) => item.id === verId);
  const dadosEscolares = separarEscolaTurma(verItem?.escola_turma);

  async function atualizarStatus(id: string, status: StatusListaEspera, mensagem: string) {
    if (!podeAnalisar) {
      toast.error("Seu perfil não tem permissão para alterar a lista de espera.");
      return false;
    }

    const { error } = await supabase.from("lista_espera").update({ status }).eq("id", id);

    if (error) {
      console.error(error);
      toast.error(`Não foi possível alterar o status: ${error.message}`);
      return false;
    }

    setItens((lista) => lista.map((item) => (item.id === id ? { ...item, status } : item)));

    toast.success(mensagem);
    return true;
  }

  async function vincularAlunoTurma(alunoId: string, turma: Turma) {
    const { data: vinculoExistente, error: buscaError } = await supabase
      .from("alunos_turmas")
      .select("id")
      .eq("aluno_id", alunoId)
      .eq("turma_id", turma.id)
      .eq("ativo", true)
      .limit(1);

    if (buscaError) {
      console.error(buscaError);
      toast.error(`Erro ao verificar vínculo com turma: ${buscaError.message}`);
      return false;
    }

    if (vinculoExistente && vinculoExistente.length > 0) {
      return true;
    }

    const temVaga = await turmaTemVaga(turma);

    if (!temVaga) return false;

    const { error } = await supabase.from("alunos_turmas").insert({
      aluno_id: alunoId,
      turma_id: turma.id,
      ativo: true,
    });

    if (error) {
      console.error(error);
      toast.error(`Aluno criado, mas não foi possível vincular à turma: ${error.message}`);
      return false;
    }

    return true;
  }

  async function converterEmAluno(item: ItemListaEspera) {
    if (!podeConverter) {
      toast.error("Seu perfil não tem permissão para converter itens da lista de espera.");
      return;
    }

    if (item.status === "aprovado") {
      toast.info("Este item já foi convertido ou aprovado.");
      return;
    }

    const confirmado = window.confirm(`Deseja converter "${item.nome_aluno}" em aluno cadastrado?`);

    if (!confirmado) return;

    const turmaEncontrada = encontrarTurmaDoItem(item, turmas);

    const { data: alunoExistente, error: buscaError } = await supabase
      .from("alunos")
      .select("id")
      .eq("nome_completo", item.nome_aluno)
      .eq("nascimento", item.nascimento)
      .limit(1);

    if (buscaError) {
      console.error(buscaError);
      toast.error(`Não foi possível verificar duplicidade: ${buscaError.message}`);
      return;
    }

    if (alunoExistente && alunoExistente.length > 0) {
      const alunoId = alunoExistente[0].id as string;

      if (turmaEncontrada) {
        const vinculado = await vincularAlunoTurma(alunoId, turmaEncontrada);

        if (!vinculado) return;
      }

      await atualizarStatus(
        item.id,
        "aprovado",
        turmaEncontrada
          ? "Convertido e aluno existente vinculado à turma."
          : "Marcado como aprovado. Aluno já existia, mas nenhuma turma correspondente foi encontrada.",
      );

      return;
    }

    if (turmaEncontrada) {
      const temVaga = await turmaTemVaga(turmaEncontrada);

      if (!temVaga) return;
    }

    const { data: alunoCriado, error: alunoError } = await supabase
      .from("alunos")
      .insert({
        nome_completo: item.nome_aluno,
        nascimento: item.nascimento,
        idade: item.idade,
        modalidade: item.modalidade,
        turma: turmaEncontrada?.nome ?? null,
        responsavel: item.responsavel,
        telefone: item.telefone,
        whatsapp: item.whatsapp,
        email: item.email,
        observacoes: item.observacoes,
        ativo: true,
      })
      .select("id")
      .single();

    if (alunoError) {
      console.error(alunoError);
      toast.error(`Não foi possível converter em aluno: ${alunoError.message}`);
      return;
    }

    if (alunoCriado?.id && turmaEncontrada) {
      const vinculado = await vincularAlunoTurma(alunoCriado.id as string, turmaEncontrada);

      if (!vinculado) return;
    }

    await atualizarStatus(
      item.id,
      "aprovado",
      turmaEncontrada
        ? "Aluno cadastrado e vinculado à turma escolhida."
        : "Aluno cadastrado. Nenhuma turma correspondente foi encontrada automaticamente.",
    );
  }

  async function excluirItem(id: string) {
    if (!podeExcluir) {
      toast.error("Apenas a Administração pode excluir itens da lista de espera.");
      return;
    }

    const confirmado = window.confirm(
      "Tem certeza que deseja excluir este item da lista de espera? Essa ação não poderá ser desfeita.",
    );

    if (!confirmado) return;

    const { error } = await supabase.from("lista_espera").delete().eq("id", id);

    if (error) {
      console.error(error);
      toast.error(`Não foi possível excluir: ${error.message}`);
      return;
    }

    setItens((lista) => lista.filter((item) => item.id !== id));
    setVerId(null);
    toast.success("Removido da lista de espera.");
  }

  const filtros: Array<{ k: "todos" | StatusListaEspera; label: string }> = [
    { k: "todos", label: "Todos" },
    { k: "fila de espera", label: "Aguardando" },
    { k: "aprovado", label: "Convertidos" },
    { k: "recusado", label: "Recusados" },
    { k: "inativo", label: "Inativos" },
    { k: "pendente", label: "Pendentes (antigos)" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Lista de espera</CardTitle>
              <CardDescription>
                {apenasVisualiza
                  ? "Visualização de quem está aguardando vaga."
                  : "Cadastre manualmente quem está aguardando vaga e acompanhe a fila por modalidade."}
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

              {podeAdicionar && (
                <Button type="button" size="sm" onClick={() => setNovoAberto(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar à lista
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {apenasVisualiza && (
            <div className="rounded-md border border-dashed border-border bg-accent/30 px-3 py-2 text-sm text-muted-foreground">
              Perfil de professor: lista de espera disponível apenas para consulta. Alterações são
              restritas à Administração e à Recepção.
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Buscar na lista de espera"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filtros.map((f) => (
                <Button
                  key={f.k}
                  variant={filtro === f.k ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltro(f.k)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Horário de interesse</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Na lista desde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtrados.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.nome_aluno}</p>
                      <p className="text-xs text-muted-foreground">{item.idade} anos</p>
                    </TableCell>

                    <TableCell>{item.modalidade}</TableCell>

                    <TableCell>{item.horario_interesse || item.turno || "—"}</TableCell>

                    <TableCell>
                      {item.responsavel ? (
                        <p className="text-sm font-medium">Responsável: {item.responsavel}</p>
                      ) : (
                        <p className="text-sm font-medium">Participante maior de idade</p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        WhatsApp: {formatarTelefone(item.whatsapp)}
                      </p>

                      {item.telefone && (
                        <p className="text-xs text-muted-foreground">
                          Telefone: {formatarTelefone(item.telefone)}
                        </p>
                      )}

                      {item.email && (
                        <p className="break-all text-xs text-muted-foreground">
                          E-mail: {item.email}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="text-sm">
                      {formatarData(item.criado_em || item.created_at)}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[item.status]}`}
                      >
                        {item.status}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setVerId(item.id)}>
                            <EyeIcon className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>

                          {podeAnalisar && (
                            <>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() =>
                                  atualizarStatus(
                                    item.id,
                                    "fila de espera",
                                    "Marcado como aguardando na fila.",
                                  )
                                }
                              >
                                <Hourglass className="mr-2 h-4 w-4" />
                                Marcar como aguardando
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  atualizarStatus(item.id, "recusado", "Marcado como recusado.")
                                }
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Recusar
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  atualizarStatus(item.id, "inativo", "Marcado como inativo.")
                                }
                              >
                                <MinusCircle className="mr-2 h-4 w-4" />
                                Inativar
                              </DropdownMenuItem>
                            </>
                          )}

                          {podeConverter && (
                            <>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-green-700 focus:text-green-700"
                                disabled={item.status === "aprovado"}
                                onClick={() => converterEmAluno(item)}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                {item.status === "aprovado"
                                  ? "Aluno já convertido"
                                  : "Converter em aluno"}
                              </DropdownMenuItem>
                            </>
                          )}

                          {podeExcluir && (
                            <>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => excluirItem(item.id)}
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
                ))}

                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {carregando
                        ? "Carregando lista de espera..."
                        : "Ninguém na lista de espera com esses filtros."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!verItem} onOpenChange={(open) => !open && setVerId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {verItem && (
            <>
              <SheetHeader>
                <SheetTitle>{verItem.nome_aluno}</SheetTitle>
                <SheetDescription>Detalhes da inscrição na lista de espera</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4 px-4 text-sm">
                <Section title="Dados">
                  <Row k="Nascimento" v={formatarData(verItem.nascimento)} />
                  <Row k="Idade" v={`${verItem.idade} anos`} />
                  <Row k="Modalidade" v={verItem.modalidade} />
                  <Row k="Horário de interesse" v={verItem.horario_interesse || verItem.turno} />

                  {dadosEscolares?.escola && <Row k="Escola" v={dadosEscolares.escola} />}

                  {dadosEscolares?.anoSerie && <Row k="Ano/Série" v={dadosEscolares.anoSerie} />}

                  {dadosEscolares?.turma && <Row k="Turma escolar" v={dadosEscolares.turma} />}

                  {!dadosEscolares && verItem.escola_turma && (
                    <Row k="Escola/Turma" v={verItem.escola_turma} />
                  )}
                </Section>

                <Section title="Contato">
                  <Row k="Responsável" v={verItem.responsavel || "Participante maior de idade"} />
                  <Row k="WhatsApp" v={formatarTelefone(verItem.whatsapp)} />
                  <Row k="Telefone" v={formatarTelefone(verItem.telefone)} />
                  <Row k="E-mail" v={verItem.email || "—"} />
                </Section>

                <Section title="Situação">
                  <Row k="Status" v={verItem.status} />
                  <Row
                    k="Na lista desde"
                    v={formatarData(verItem.criado_em || verItem.created_at)}
                  />
                </Section>

                <Section title="Observações">
                  <p className="whitespace-pre-line text-muted-foreground">
                    {verItem.observacoes || "Nenhuma observação informada."}
                  </p>
                </Section>

                {podeAnalisar && (
                  <div className="flex flex-col gap-2 pt-2">
                    {podeConverter && (
                      <Button
                        type="button"
                        disabled={verItem.status === "aprovado"}
                        onClick={() => converterEmAluno(verItem)}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        {verItem.status === "aprovado"
                          ? "Aluno já convertido"
                          : "Converter em aluno"}
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        atualizarStatus(
                          verItem.id,
                          "fila de espera",
                          "Marcado como aguardando na fila.",
                        )
                      }
                    >
                      <Hourglass className="mr-2 h-4 w-4" />
                      Marcar como aguardando
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        atualizarStatus(verItem.id, "recusado", "Marcado como recusado.")
                      }
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Recusar
                    </Button>

                    {podeExcluir && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => excluirItem(verItem.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir da lista
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {podeAdicionar && (
        <NovoItemDialog
          open={novoAberto}
          onOpenChange={setNovoAberto}
          onSaved={carregarTudo}
          turmas={turmas}
        />
      )}
    </div>
  );
}

function NovoItemDialog({
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
  const estadoInicial = {
    nome_aluno: "",
    nascimento: "",
    modalidade: "Natação Infantil" as Modalidade,
    turma_id: SEM_TURMA,
    responsavel: "",
    telefone: "",
    whatsapp: "",
    email: "",
    observacoes: "",
  };

  const [f, setF] = useState(estadoInicial);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) setF(estadoInicial);
  }, [open]);

  const turmasFiltradas = turmas.filter((t) => t.ativa && t.modalidade === f.modalidade);

  async function submit() {
    if (!f.nome_aluno.trim()) {
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

    setSalvando(true);

    const { error } = await supabase.from("lista_espera").insert({
      nome_aluno: f.nome_aluno.trim(),
      nascimento: f.nascimento,
      idade: calcIdade(f.nascimento),
      modalidade: f.modalidade,
      turno: null,
      horario_interesse: turmaSelecionada ? labelTurma(turmaSelecionada) : null,
      escola_turma: null,
      responsavel: f.responsavel.trim() || null,
      telefone: f.telefone.trim() || null,
      whatsapp: f.whatsapp.trim(),
      email: f.email.trim() || null,
      observacoes: f.observacoes.trim() || null,
      status: "fila de espera",
    });

    setSalvando(false);

    if (error) {
      console.error(error);
      toast.error(`Não foi possível adicionar à lista de espera: ${error.message}`);
      return;
    }

    toast.success("Adicionado à lista de espera.");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar à lista de espera</DialogTitle>
          <DialogDescription>
            Use quando não houver vaga disponível no momento do contato. Assim que abrir vaga,
            encontre a pessoa aqui pelo filtro "Aguardando".
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Campo label="Nome completo">
            <Input
              value={f.nome_aluno}
              onChange={(e) => setF((a) => ({ ...a, nome_aluno: e.target.value }))}
              placeholder="Nome do interessado"
              disabled={salvando}
            />
          </Campo>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Data de nascimento">
              <Input
                type="date"
                value={f.nascimento}
                onChange={(e) => setF((a) => ({ ...a, nascimento: e.target.value }))}
                disabled={salvando}
              />
            </Campo>
            <Campo label="Modalidade">
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
                disabled={salvando}
              >
                {modalidades.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo label="Turma de interesse (opcional)">
            <select
              value={f.turma_id}
              onChange={(e) => setF((a) => ({ ...a, turma_id: e.target.value }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={salvando}
            >
              <option value={SEM_TURMA}>Sem preferência específica</option>
              {turmasFiltradas.map((t) => (
                <option key={t.id} value={t.id}>
                  {labelTurma(t)}
                </option>
              ))}
            </select>
          </Campo>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Responsável (se menor de idade)">
              <Input
                value={f.responsavel}
                onChange={(e) => setF((a) => ({ ...a, responsavel: e.target.value }))}
                placeholder="Opcional"
                disabled={salvando}
              />
            </Campo>
            <Campo label="WhatsApp">
              <Input
                value={f.whatsapp}
                onChange={(e) => setF((a) => ({ ...a, whatsapp: somenteNumeros(e.target.value) }))}
                placeholder="DDD + número"
                maxLength={11}
                disabled={salvando}
              />
            </Campo>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Telefone (opcional)">
              <Input
                value={f.telefone}
                onChange={(e) => setF((a) => ({ ...a, telefone: somenteNumeros(e.target.value) }))}
                placeholder="Opcional"
                maxLength={11}
                disabled={salvando}
              />
            </Campo>
            <Campo label="E-mail (opcional)">
              <Input
                type="email"
                value={f.email}
                onChange={(e) => setF((a) => ({ ...a, email: e.target.value }))}
                placeholder="Opcional"
                disabled={salvando}
              />
            </Campo>
          </div>

          <Campo label="Observações">
            <Textarea
              value={f.observacoes}
              onChange={(e) => setF((a) => ({ ...a, observacoes: e.target.value }))}
              placeholder="Qualquer informação relevante pra quando a vaga abrir"
              disabled={salvando}
            />
          </Campo>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={submit} disabled={salvando}>
              {salvando ? "Salvando..." : "Adicionar à lista"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v || "—"}</span>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
