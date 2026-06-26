import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { getSessao } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/pre-cadastros")({
  head: () => ({ meta: [{ title: "Pré-cadastros" }] }),
  component: PreCadastrosAdmin,
});

type StatusPreCadastro =
  | "pendente"
  | "aprovado"
  | "fila de espera"
  | "recusado"
  | "inativo";

type PreCadastro = {
  id: string;
  nome_aluno: string;
  nascimento: string;
  idade: number;
  modalidade: string;
  turno: string;
  horario_interesse: string | null;
  escola_turma: string | null;
  observacoes: string | null;
  responsavel: string | null;
  telefone: string | null;
  whatsapp: string;
  email: string | null;
  status: StatusPreCadastro;
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

const statusStyle: Record<StatusPreCadastro, string> = {
  pendente: "border border-yellow-300 bg-yellow-50 text-yellow-800",
  aprovado: "border border-green-300 bg-green-50 text-green-700",
  "fila de espera": "border border-blue-300 bg-blue-50 text-blue-700",
  recusado: "border border-red-300 bg-red-50 text-red-700",
  inativo: "border border-muted bg-muted text-muted-foreground",
};

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

function encontrarTurmaDoPreCadastro(pre: PreCadastro, turmas: Turma[]) {
  const modalidadePre = normalizarTexto(pre.modalidade);
  const textoPre = normalizarTexto(`${pre.horario_interesse ?? ""} ${pre.turno ?? ""}`);
  const horaPre = extrairHora(pre.horario_interesse || pre.turno);

  const turmasDaModalidade = turmas.filter(
    (turma) => turma.ativa && normalizarTexto(turma.modalidade) === modalidadePre,
  );

  if (turmasDaModalidade.length === 0) return null;

  if (horaPre) {
    const porHora = turmasDaModalidade.filter(
      (turma) => turma.horario_inicio?.slice(0, 5) === horaPre,
    );

    if (porHora.length === 1) return porHora[0];

    if (porHora.length > 1) {
      const porTexto = porHora.find((turma) => {
        const texto = textoTurma(turma);
        return textoPre.includes(texto) || texto.includes(textoPre);
      });

      return porTexto ?? porHora[0];
    }
  }

  const porTexto = turmasDaModalidade.find((turma) => {
    const texto = textoTurma(turma);
    return textoPre.includes(texto) || texto.includes(textoPre);
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

function PreCadastrosAdmin() {
  const sessao = getSessao();
  const perfil = sessao?.perfil;

  const podeAnalisar = perfil === "Administrador" || perfil === "Recepção";
  const podeConverter = perfil === "Administrador" || perfil === "Recepção";
  const podeExcluir = perfil === "Administrador";
  const apenasVisualiza = perfil === "Professor";

  const [preCadastros, setPreCadastros] = useState<PreCadastro[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | StatusPreCadastro>("todos");
  const [verId, setVerId] = useState<string | null>(null);

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

  async function carregarPreCadastros() {
    const { data, error } = await supabase
      .from("pre_cadastros")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error(`Erro ao carregar pré-cadastros: ${error.message}`);
      return;
    }

    setPreCadastros((data ?? []) as PreCadastro[]);
  }

  async function carregarTudo() {
    setCarregando(true);
    await Promise.all([carregarPreCadastros(), carregarTurmas()]);
    setCarregando(false);
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  const filtrados = useMemo(() => {
    const busca = q.trim().toLowerCase();

    return preCadastros.filter((pre) => {
      const passaFiltro = filtro === "todos" || pre.status === filtro;

      const passaBusca =
        !busca ||
        pre.nome_aluno.toLowerCase().includes(busca) ||
        (pre.responsavel ?? "").toLowerCase().includes(busca) ||
        pre.whatsapp.toLowerCase().includes(busca) ||
        (pre.telefone ?? "").toLowerCase().includes(busca) ||
        (pre.email ?? "").toLowerCase().includes(busca);

      return passaFiltro && passaBusca;
    });
  }, [preCadastros, q, filtro]);

  const verItem = preCadastros.find((pre) => pre.id === verId);
  const dadosEscolares = separarEscolaTurma(verItem?.escola_turma);

  async function atualizarStatus(
    id: string,
    status: StatusPreCadastro,
    mensagem: string,
  ) {
    if (!podeAnalisar) {
      toast.error("Seu perfil não tem permissão para alterar pré-cadastros.");
      return false;
    }

    const { error } = await supabase
      .from("pre_cadastros")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error(error);
      toast.error(`Não foi possível alterar o status: ${error.message}`);
      return false;
    }

    setPreCadastros((lista) =>
      lista.map((pre) => (pre.id === id ? { ...pre, status } : pre)),
    );

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

  async function converterEmAluno(pre: PreCadastro) {
    if (!podeConverter) {
      toast.error("Seu perfil não tem permissão para converter pré-cadastros.");
      return;
    }

    if (pre.status === "aprovado") {
      toast.info("Este pré-cadastro já foi convertido ou aprovado.");
      return;
    }

    const confirmado = window.confirm(
      `Deseja converter "${pre.nome_aluno}" em aluno cadastrado?`,
    );

    if (!confirmado) return;

    const turmaEncontrada = encontrarTurmaDoPreCadastro(pre, turmas);

    const { data: alunoExistente, error: buscaError } = await supabase
      .from("alunos")
      .select("id")
      .eq("nome_completo", pre.nome_aluno)
      .eq("nascimento", pre.nascimento)
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
        pre.id,
        "aprovado",
        turmaEncontrada
          ? "Pré-cadastro aprovado e aluno existente vinculado à turma."
          : "Pré-cadastro aprovado. Aluno já existia, mas nenhuma turma correspondente foi encontrada.",
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
        nome_completo: pre.nome_aluno,
        nascimento: pre.nascimento,
        idade: pre.idade,
        modalidade: pre.modalidade,
        turma: turmaEncontrada?.nome ?? null,
        responsavel: pre.responsavel,
        telefone: pre.telefone,
        whatsapp: pre.whatsapp,
        email: pre.email,
        observacoes: pre.observacoes,
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
      pre.id,
      "aprovado",
      turmaEncontrada
        ? "Aluno cadastrado e vinculado à turma escolhida."
        : "Aluno cadastrado. Nenhuma turma correspondente foi encontrada automaticamente.",
    );
  }

  async function excluirPreCadastro(id: string) {
    if (!podeExcluir) {
      toast.error("Apenas a Administração pode excluir pré-cadastros.");
      return;
    }

    const confirmado = window.confirm(
      "Tem certeza que deseja excluir este pré-cadastro? Essa ação não poderá ser desfeita.",
    );

    if (!confirmado) return;

    const { error } = await supabase.from("pre_cadastros").delete().eq("id", id);

    if (error) {
      console.error(error);
      toast.error(`Não foi possível excluir o pré-cadastro: ${error.message}`);
      return;
    }

    setPreCadastros((lista) => lista.filter((pre) => pre.id !== id));
    setVerId(null);
    toast.success("Pré-cadastro excluído.");
  }

  const filtros: Array<{ k: "todos" | StatusPreCadastro; label: string }> = [
    { k: "todos", label: "Todos" },
    { k: "pendente", label: "Pendentes" },
    { k: "aprovado", label: "Aprovados" },
    { k: "fila de espera", label: "Fila de espera" },
    { k: "recusado", label: "Recusados" },
    { k: "inativo", label: "Inativos" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Pré-cadastros recebidos</CardTitle>
              <CardDescription>
                {apenasVisualiza
                  ? "Visualização das solicitações recebidas pelo sistema."
                  : "Aprovar, converter, encaminhar para fila ou recusar solicitações."}
              </CardDescription>
            </div>

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
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {apenasVisualiza && (
            <div className="rounded-md border border-dashed border-border bg-accent/30 px-3 py-2 text-sm text-muted-foreground">
              Perfil de professor: pré-cadastros disponíveis apenas para consulta.
              Alterações são restritas à Administração e à Recepção.
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Buscar pré-cadastro"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filtros.map((item) => (
                <Button
                  key={item.k}
                  variant={filtro === item.k ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltro(item.k)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtrados.map((pre) => (
                  <TableRow key={pre.id}>
                    <TableCell>
                      <p className="font-medium">{pre.nome_aluno}</p>
                      <p className="text-xs text-muted-foreground">{pre.idade} anos</p>
                    </TableCell>

                    <TableCell>{pre.modalidade}</TableCell>

                    <TableCell>{pre.horario_interesse || pre.turno}</TableCell>

                    <TableCell>
                      {pre.responsavel ? (
                        <p className="text-sm font-medium">
                          Responsável: {pre.responsavel}
                        </p>
                      ) : (
                        <p className="text-sm font-medium">
                          Participante maior de idade
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        WhatsApp: {formatarTelefone(pre.whatsapp)}
                      </p>

                      {pre.telefone && (
                        <p className="text-xs text-muted-foreground">
                          Telefone: {formatarTelefone(pre.telefone)}
                        </p>
                      )}

                      {pre.email && (
                        <p className="break-all text-xs text-muted-foreground">
                          E-mail: {pre.email}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="text-sm">
                      {formatarData(pre.criado_em || pre.created_at)}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[pre.status]}`}
                      >
                        {pre.status}
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
                          <DropdownMenuItem onClick={() => setVerId(pre.id)}>
                            <EyeIcon className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>

                          {podeAnalisar && (
                            <>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() =>
                                  atualizarStatus(
                                    pre.id,
                                    "fila de espera",
                                    "Encaminhado para fila de espera.",
                                  )
                                }
                              >
                                <Hourglass className="mr-2 h-4 w-4" />
                                Colocar em fila
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  atualizarStatus(
                                    pre.id,
                                    "recusado",
                                    "Pré-cadastro recusado.",
                                  )
                                }
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Recusar
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  atualizarStatus(
                                    pre.id,
                                    "inativo",
                                    "Pré-cadastro marcado como inativo.",
                                  )
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
                                disabled={pre.status === "aprovado"}
                                onClick={() => converterEmAluno(pre)}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                {pre.status === "aprovado"
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
                                onClick={() => excluirPreCadastro(pre.id)}
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
                        ? "Carregando pré-cadastros..."
                        : "Nenhum pré-cadastro encontrado."}
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
                <SheetDescription>Detalhes do pré-cadastro</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4 px-4 text-sm">
                <Section title="Dados do aluno">
                  <Row k="Nascimento" v={formatarData(verItem.nascimento)} />
                  <Row k="Idade" v={`${verItem.idade} anos`} />
                  <Row k="Modalidade" v={verItem.modalidade} />
                  <Row k="Horário" v={verItem.horario_interesse || verItem.turno} />

                  {dadosEscolares?.escola && (
                    <Row k="Escola" v={dadosEscolares.escola} />
                  )}

                  {dadosEscolares?.anoSerie && (
                    <Row k="Ano/Série" v={dadosEscolares.anoSerie} />
                  )}

                  {dadosEscolares?.turma && (
                    <Row k="Turma escolar" v={dadosEscolares.turma} />
                  )}

                  {!dadosEscolares && verItem.escola_turma && (
                    <Row k="Escola/Turma" v={verItem.escola_turma} />
                  )}
                </Section>

                <Section title="Contato">
                  <Row
                    k="Responsável"
                    v={verItem.responsavel || "Participante maior de idade"}
                  />
                  <Row k="WhatsApp" v={formatarTelefone(verItem.whatsapp)} />
                  <Row k="Telefone" v={formatarTelefone(verItem.telefone)} />
                  <Row k="E-mail" v={verItem.email || "—"} />
                </Section>

                <Section title="Situação">
                  <Row k="Status" v={verItem.status} />
                  <Row k="Recebido em" v={formatarData(verItem.criado_em)} />
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
                          "Encaminhado para fila de espera.",
                        )
                      }
                    >
                      <Hourglass className="mr-2 h-4 w-4" />
                      Colocar em fila de espera
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        atualizarStatus(
                          verItem.id,
                          "recusado",
                          "Pré-cadastro recusado.",
                        )
                      }
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Recusar
                    </Button>

                    {podeExcluir && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => excluirPreCadastro(verItem.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir pré-cadastro
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  k,
  v,
}: {
  k: string;
  v?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v || "—"}</span>
    </div>
  );
}