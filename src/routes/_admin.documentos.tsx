import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessao } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/documentos")({
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

const statusCfg: Record<string, { label: string; badge: string; icon: typeof CheckCircle2 }> = {
  pendente:  { label: "Pendente",  badge: "border-yellow-300 bg-yellow-50 text-yellow-700", icon: Clock },
  aprovado:  { label: "Aprovado",  badge: "border-green-300 bg-green-50 text-green-700",   icon: CheckCircle2 },
  rejeitado: { label: "Rejeitado", badge: "border-red-300 bg-red-50 text-red-700",         icon: XCircle },
};

const tipoCfg: Record<string, string> = {
  atestado: "Atestado médico",
  par_q:    "PAR-Q",
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
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pendente" | "aprovado" | "rejeitado">("pendente");
  const [busca, setBusca] = useState("");
  const [analisando, setAnalisando] = useState<Documento | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
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
      `Tem certeza que deseja excluir permanentemente o documento (${tipoCfg[doc.tipo] ?? doc.tipo}) de ${doc.aluno_nome}? Essa ação não pode ser desfeita e remove o arquivo do Storage também.`
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

  useEffect(() => { carregarDocumentos(); }, []);

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
            <CardTitle className={totalPendente > 0 ? "text-yellow-700" : ""}>{totalPendente}</CardTitle>
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
                Atestados médicos e formulários PAR-Q enviados pelos alunos pelo portal.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={carregarDocumentos} disabled={carregando}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
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
                      <TableCell>
                        {tipoCfg[doc.tipo] ?? doc.tipo}
                      </TableCell>
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
                        <Badge className={cfg?.badge ?? "border-border bg-muted text-muted-foreground"}>
                          <Icon className="mr-1 h-3 w-3" />
                          {cfg?.label ?? doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(doc.url ?? []).map((caminho, i) => (
                            
                              <a key={caminho}
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAnalisando(doc)}
                            >
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
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
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
          onOpenChange={(open) => { if (!open) setAnalisando(null); }}
          onSaved={() => { setAnalisando(null); carregarDocumentos(); }}
        />
      )}
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
      novoStatus === "aprovado" ? "Documento aprovado e validade atualizada no cadastro." : "Documento rejeitado."
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
                  <a href={urlsAssinadas[caminho]} target="_blank" rel="noreferrer" className="shrink-0">
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