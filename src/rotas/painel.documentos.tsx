import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/utilitarios/supabase";
import { getSessao } from "@/utilitarios/autenticacao";
import { pontuarTexto } from "@/utilitarios/relevancia-busca";
import { Input } from "@/componentes/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import {
  CheckCircle2,
  Clock,
  Eye,
  FilePlus2,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/documentos")({
  head: () => ({ meta: [{ title: "Documentos Enviados" }] }),
  component: DocumentosAdmin,
});

type Documento = {
  id: string;
  aluno_id: string;
  tipo: string;
  nome_arquivo: string[] | null;
  url: string[] | null;
  status: string;
  observacao: string | null;
  criado_em: string;
  aluno_nome: string;
};

type AlunoBusca = {
  id: string;
  nome_completo: string;
};

const statusCfg: Record<string, { label: string; badge: string; icon: typeof CheckCircle2 }> = {
  pendente: {
    label: "Pendente",
    badge: "border-yellow-300 bg-yellow-50 text-yellow-700",
    icon: Clock,
  },
  aprovado: {
    label: "Aprovado",
    badge: "border-green-300 bg-green-50 text-green-700",
    icon: CheckCircle2,
  },
  rejeitado: { label: "Rejeitado", badge: "border-red-300 bg-red-50 text-red-700", icon: XCircle },
};

const tipoCfg: Record<string, string> = {
  atestado: "Atestado médico",
  par_q: "PAR-Q",
};

function formatarDataHora(data?: string | null) {
  if (!data) return "—";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Remove acentos e caixa para permitir busca tipo "joao" encontrar "João".
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function DocumentosAdmin() {
  const sessao = getSessao();
  const perfil = sessao?.perfil;
  const podeAnalizar = perfil === "Administrador" || perfil === "Recepção";
  const podeExcluir = perfil === "Administrador";

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [urlsAssinadas, setUrlsAssinadas] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pendente" | "aprovado" | "rejeitado">(
    "pendente",
  );
  const [busca, setBusca] = useState("");
  const [analisando, setAnalisando] = useState<Documento | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);

  async function carregarDocumentos() {
    setCarregando(true);

    const { data, error } = await supabase.rpc("admin_listar_documentos");

    if (error) {
      toast.error(error.message || "Erro ao carregar documentos.");
      console.error(error);
      setCarregando(false);
      return;
    }

    const docs = (data ?? []) as Documento[];
    setDocumentos(docs);

    // "url" guarda só o caminho no Storage (bucket privado) — gera
    // URLs assinadas para poder visualizar/baixar.
    const todosCaminhos = docs.flatMap((d) => d.url ?? []);
    if (todosCaminhos.length > 0) {
      const { data: assinadas, error: erroAssinadas } = await supabase.storage
        .from("documentos-aluno")
        .createSignedUrls(todosCaminhos, 60 * 10);

      if (!erroAssinadas && assinadas) {
        const mapa: Record<string, string> = {};
        assinadas.forEach((item, i) => {
          if (item.signedUrl) mapa[todosCaminhos[i]] = item.signedUrl;
        });
        setUrlsAssinadas(mapa);
      }
    }

    setCarregando(false);
  }

  async function excluirDocumento(doc: Documento) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir permanentemente o documento (${tipoCfg[doc.tipo] ?? doc.tipo}) de ${doc.aluno_nome}? Essa ação não pode ser desfeita e remove o arquivo do Storage também.`,
    );
    if (!confirmar) return;

    setExcluindo(doc.id);

    try {
      const { data, error } = await supabase.rpc("admin_excluir_documento", {
        p_documento_id: doc.id,
      });

      if (error) throw error;

      const urlsArquivos = data?.[0]?.url;
      if (urlsArquivos?.length) {
        await supabase.storage.from("documentos-aluno").remove(urlsArquivos);
      }

      toast.success("Documento excluído.");
      await carregarDocumentos();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Erro ao excluir o documento.");
      console.error(erro);
    } finally {
      setExcluindo(null);
    }
  }

  useEffect(() => {
    carregarDocumentos();
  }, []);

  const filtrados = documentos.filter((d) => {
    const passaStatus = filtroStatus === "todos" ? true : d.status === filtroStatus;
    const passaBusca = busca.trim() === "" || normalizar(d.aluno_nome).includes(normalizar(busca));
    return passaStatus && passaBusca;
  });

  const totalPendente = documentos.filter((d) => d.status === "pendente").length;

  return (
    <div className="space-y-4">
      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className={totalPendente > 0 ? "text-yellow-700" : ""}>
              {totalPendente}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aprovados</CardDescription>
            <CardTitle>{documentos.filter((d) => d.status === "aprovado").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rejeitados</CardDescription>
            <CardTitle>{documentos.filter((d) => d.status === "rejeitado").length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Documentos enviados</CardTitle>
              <CardDescription>
                Atestados médicos e formulários PAR-Q enviados pelos alunos pelo portal, ou
                registrados manualmente pela secretaria.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {podeAnalizar && (
                <Button type="button" size="sm" onClick={() => setRegistrando(true)}>
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  Registrar documento
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={carregarDocumentos}
                disabled={carregando}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filtro de status + busca por aluno */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["todos", "pendente", "aprovado", "rejeitado"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFiltroStatus(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    filtroStatus === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {s === "todos" ? "Todos" : statusCfg[s].label}
                  {s === "pendente" && totalPendente > 0 && (
                    <span className="ml-1.5 rounded-full bg-yellow-500 px-1.5 py-0.5 text-[10px] text-white">
                      {totalPendente}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por aluno..."
                className="pl-9 pr-8"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((doc) => {
                  const cfg = statusCfg[doc.status];
                  const Icon = cfg?.icon ?? FileText;
                  const nomesArquivos = (doc.nome_arquivo ?? []).join(", ") || "—";
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <p className="font-medium">{doc.aluno_nome}</p>
                      </TableCell>
                      <TableCell>{tipoCfg[doc.tipo] ?? doc.tipo}</TableCell>
                      <TableCell>
                        <p
                          className="max-w-45 truncate text-sm text-muted-foreground"
                          title={nomesArquivos}
                        >
                          {nomesArquivos}
                        </p>
                      </TableCell>
                      <TableCell>{formatarDataHora(doc.criado_em)}</TableCell>
                      <TableCell>
                        <Badge
                          className={cfg?.badge ?? "border-border bg-muted text-muted-foreground"}
                        >
                          <Icon className="mr-1 h-3 w-3" />
                          {cfg?.label ?? doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(doc.url ?? []).map((caminho, i) => (
                            <a
                              key={caminho}
                              href={urlsAssinadas[caminho]}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                title={`Abrir ${doc.nome_arquivo?.[i] ?? "arquivo"}`}
                                disabled={!urlsAssinadas[caminho]}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </a>
                          ))}
                          {podeAnalizar && doc.status === "pendente" && (
                            <Button size="sm" variant="outline" onClick={() => setAnalisando(doc)}>
                              Analisar
                            </Button>
                          )}
                          {podeExcluir && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => excluirDocumento(doc)}
                              disabled={excluindo === doc.id}
                              title="Excluir documento (apenas administração)"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {carregando
                        ? "Carregando documentos..."
                        : busca.trim()
                          ? `Nenhum resultado para "${busca}".`
                          : "Nenhum documento encontrado."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {analisando && (
        <AnalisarDialog
          doc={analisando}
          urlsAssinadas={urlsAssinadas}
          open={!!analisando}
          onOpenChange={(open) => {
            if (!open) setAnalisando(null);
          }}
          onSaved={() => {
            setAnalisando(null);
            carregarDocumentos();
          }}
        />
      )}

      <RegistrarDialog
        open={registrando}
        onOpenChange={setRegistrando}
        onSaved={carregarDocumentos}
      />
    </div>
  );
}

function AnalisarDialog({
  doc,
  urlsAssinadas,
  open,
  onOpenChange,
  onSaved,
}: {
  doc: Documento;
  urlsAssinadas: Record<string, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [observacao, setObservacao] = useState("");
  const [validade, setValidade] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function atualizar(novoStatus: "aprovado" | "rejeitado") {
    if (novoStatus === "rejeitado" && !observacao.trim()) {
      toast.error("Informe o motivo da rejeição.");
      return;
    }
    if (novoStatus === "aprovado" && !validade) {
      toast.error("Informe a data de validade para aprovar.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase.rpc("admin_atualizar_documento", {
      p_documento_id: doc.id,
      p_status: novoStatus,
      p_observacao: observacao.trim() || null,
      p_validade: novoStatus === "aprovado" ? validade : null,
    });

    if (error) {
      toast.error(error.message || "Erro ao atualizar o documento.");
      console.error(error);
      setSalvando(false);
      return;
    }

    toast.success(
      novoStatus === "aprovado"
        ? "Documento aprovado e validade atualizada no cadastro."
        : "Documento rejeitado.",
    );
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Analisar documento
          </DialogTitle>
          <DialogDescription>
            {tipoCfg[doc.tipo] ?? doc.tipo} enviado por {doc.aluno_nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview / link dos arquivos (pode ter mais de 1, ex: PAR-Q) */}
          <div className="space-y-2">
            {(doc.url ?? []).map((caminho, i) => {
              const nome = doc.nome_arquivo?.[i] ?? `Arquivo ${i + 1}`;
              return (
                <div
                  key={caminho}
                  className="flex items-center gap-2 justify-between rounded-lg border border-border bg-accent/20 px-3 py-2.5"
                >
                  <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground" title={nome}>
                    {nome}
                  </p>
                  <a
                    href={urlsAssinadas[caminho]}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0"
                  >
                    <Button size="sm" variant="outline" disabled={!urlsAssinadas[caminho]}>
                      <Eye className="mr-2 h-4 w-4" />
                      Abrir
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>

          {/* Validade (obrigatória para aprovar) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Validade do {tipoCfg[doc.tipo] ?? doc.tipo}{" "}
              <span className="text-muted-foreground">(obrigatória para aprovar)</span>
            </label>
            <Input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              disabled={salvando}
            />
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Observação <span className="text-muted-foreground">(obrigatória se rejeitar)</span>
            </label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: Atestado com data vencida. Por favor, envie um novo."
              disabled={salvando}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              disabled={salvando}
              onClick={() => atualizar("rejeitado")}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Rejeitar
            </Button>
            <Button
              type="button"
              className="flex-1 bg-green-700 hover:bg-green-800"
              disabled={salvando}
              onClick={() => atualizar("aprovado")}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Aprovar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RegistrarDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [aluno, setAluno] = useState<AlunoBusca | null>(null);
  const [buscaAluno, setBuscaAluno] = useState("");
  const [resultadosAluno, setResultadosAluno] = useState<AlunoBusca[]>([]);
  const [tipo, setTipo] = useState<"atestado" | "par_q">("atestado");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [validade, setValidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const refArquivo = useRef<HTMLInputElement>(null);

  // Busca aluno por nome (debounced), só enquanto nenhum estiver selecionado.
  useEffect(() => {
    if (aluno) return;
    if (buscaAluno.trim().length < 2) {
      setResultadosAluno([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const termo = buscaAluno.trim();
      const { data, error } = await supabase
        .from("alunos")
        .select("id, nome_completo")
        .ilike("nome_completo", `%${termo}%`)
        .limit(40);

      if (error) return;

      // O ILIKE traz até 40 candidatos; a ordem de exibição (top 8) vem da
      // relevância (igual > começa com > palavra começa com > contém), não
      // da ordem alfabética do banco — senão "Adilza Maria..." aparece antes
      // de "Maria Eduarda..." só por causa do "A" no começo do nome completo.
      const ranqueados = (data ?? [])
        .map((item) => ({ item, score: pontuarTexto(item.nome_completo, termo, 1) }))
        .sort(
          (a, b) =>
            b.score - a.score ||
            a.item.nome_completo.localeCompare(b.item.nome_completo, "pt-BR", {
              sensitivity: "base",
            }),
        )
        .slice(0, 8)
        .map((r) => r.item);

      setResultadosAluno(ranqueados as AlunoBusca[]);
    }, 300);
    return () => clearTimeout(timeout);
  }, [buscaAluno, aluno]);

  function fechar() {
    setAluno(null);
    setBuscaAluno("");
    setResultadosAluno([]);
    setTipo("atestado");
    setArquivos([]);
    setValidade("");
    setObservacao("");
    onOpenChange(false);
  }

  async function salvar() {
    if (!aluno) {
      toast.error("Selecione o aluno.");
      return;
    }
    if (arquivos.length === 0) {
      toast.error("Anexe ao menos um arquivo (foto ou PDF do documento).");
      return;
    }
    if (!validade) {
      toast.error("Informe a data de validade.");
      return;
    }

    setSalvando(true);

    try {
      const caminhos: string[] = [];
      const nomes: string[] = [];

      for (const arquivo of arquivos) {
        const ext = arquivo.name.split(".").pop();
        const caminho = `${aluno.id}/${tipo}-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("documentos-aluno")
          .upload(caminho, arquivo, { upsert: false });

        if (uploadError) throw uploadError;

        caminhos.push(caminho);
        nomes.push(arquivo.name);
      }

      const { error } = await supabase.rpc("admin_registrar_documento", {
        p_aluno_id: aluno.id,
        p_tipo: tipo,
        p_nomes_arquivo: nomes,
        p_urls: caminhos,
        p_validade: validade,
        p_observacao: observacao.trim() || null,
      });

      if (error) throw error;

      toast.success(`${tipoCfg[tipo]} registrado para ${aluno.nome_completo}.`);
      fechar();
      onSaved();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Erro ao registrar o documento.");
      console.error(erro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) fechar();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-primary" />
            Registrar documento manualmente
          </DialogTitle>
          <DialogDescription>
            Use para documentos entregues em papel na secretaria (ex.: matrícula presencial). O
            documento já entra como aprovado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aluno */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Aluno</label>
            {aluno ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-accent/20 px-3 py-2 text-sm">
                <span className="font-medium">{aluno.nome_completo}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAluno(null);
                    setBuscaAluno("");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  title="Trocar aluno"
                  disabled={salvando}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={buscaAluno}
                  onChange={(e) => setBuscaAluno(e.target.value)}
                  placeholder="Buscar aluno pelo nome..."
                  className="pl-9"
                  disabled={salvando}
                />
                {resultadosAluno.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-md">
                    {resultadosAluno.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setAluno(a);
                          setResultadosAluno([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        {a.nome_completo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tipo de documento</label>
            <div className="flex gap-2">
              {(["atestado", "par_q"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTipo(t);
                    setArquivos([]);
                  }}
                  disabled={salvando}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    tipo === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {tipoCfg[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Arquivo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Arquivo (foto ou PDF do documento)</label>
            <input
              ref={refArquivo}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple={tipo === "par_q"}
              className="hidden"
              onChange={(e) => setArquivos(Array.from(e.target.files ?? []))}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refArquivo.current?.click()}
              disabled={salvando}
            >
              {arquivos.length > 0
                ? `${arquivos.length} arquivo(s) selecionado(s)`
                : "Escolher arquivo"}
            </Button>
            <p className="text-xs text-muted-foreground">
              PNG, JPG ou PDF.{tipo === "par_q" ? " Pode selecionar até 2 (frente e verso)." : ""}
            </p>
          </div>

          {/* Validade */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Validade <span className="text-muted-foreground">(obrigatória)</span>
            </label>
            <Input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              disabled={salvando}
            />
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Observação <span className="text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: Entregue na matrícula presencial em 12/07/2026."
              disabled={salvando}
            />
          </div>

          <Button
            type="button"
            className="w-full bg-green-700 hover:bg-green-800"
            disabled={salvando}
            onClick={salvar}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {salvando ? "Registrando..." : "Registrar como aprovado"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
