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
  Download,
  Eye,
  FileText,
  RefreshCw,
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
  nome_arquivo: string;
  url: string;
  status: string;
  observacao: string | null;
  criado_em: string;
  aluno_nome: string;
};

type DocumentoRaw = {
  id: string;
  aluno_id: string;
  tipo: string;
  nome_arquivo: string;
  url: string;
  status: string;
  observacao: string | null;
  criado_em: string;
  alunos: { nome_completo: string }[] | null;
};

const statusCfg: Record<string, { label: string; badge: string; icon: typeof CheckCircle2 }> = {
  pendente:  { label: "Pendente",  badge: "border-yellow-300 bg-yellow-50 text-yellow-700", icon: Clock },
  aprovado:  { label: "Aprovado",  badge: "border-green-300 bg-green-50 text-green-700",   icon: CheckCircle2 },
  rejeitado: { label: "Rejeitado", badge: "border-red-300 bg-red-50 text-red-700",         icon: XCircle },
};

const tipoCfg: Record<string, string> = {
  atestado: "Atestado médico",
  parq:     "PAR-Q",
};

function formatarDataHora(data?: string | null) {
  if (!data) return "—";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function DocumentosAdmin() {
  const sessao = getSessao();
  const perfil = sessao?.perfil;
  const podeAnalizar = perfil === "Administrador" || perfil === "Recepção";

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pendente" | "aprovado" | "rejeitado">("pendente");
  const [analisando, setAnalisando] = useState<Documento | null>(null);

  async function carregarDocumentos() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("documentos_aluno")
      .select("id, aluno_id, tipo, nome_arquivo, url, status, observacao, criado_em, alunos(nome_completo)")
      .order("criado_em", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar documentos.");
      console.error(error);
      setCarregando(false);
      return;
    }

    const docs = ((data ?? []) as DocumentoRaw[]).map((d) => ({
      ...d,
      aluno_nome: d.alunos?.[0]?.nome_completo ?? "Aluno não encontrado",
    }));

    setDocumentos(docs);
    setCarregando(false);
  }

  useEffect(() => { carregarDocumentos(); }, []);

  const filtrados = documentos.filter((d) =>
    filtroStatus === "todos" ? true : d.status === filtroStatus
  );

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
          {/* Filtro de status */}
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
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <p className="font-medium">{doc.aluno_nome}</p>
                      </TableCell>
                      <TableCell>
                        {tipoCfg[doc.tipo] ?? doc.tipo}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[180px] truncate text-sm text-muted-foreground">
                          {doc.nome_arquivo}
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
                          <a href={doc.url} target="_blank" rel="noreferrer">
                            <Button size="icon" variant="ghost" title="Abrir arquivo">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </a>
                          <a href={doc.url} download={doc.nome_arquivo} target="_blank" rel="noreferrer">
                            <Button size="icon" variant="ghost" title="Baixar arquivo">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                          {podeAnalizar && doc.status === "pendente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAnalisando(doc)}
                            >
                              Analisar
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
                      {carregando ? "Carregando documentos..." : "Nenhum documento encontrado."}
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
  open,
  onOpenChange,
  onSaved,
}: {
  doc: Documento;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [observacao, setObservacao] = useState("");
  const [validade, setValidade] = useState("");
  const [salvando, setSalvando] = useState(false);

  const campoValidade = doc.tipo === "parq" ? "parq_validade" : "atestado_validade";

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

    const { error } = await supabase
      .from("documentos_aluno")
      .update({ status: novoStatus, observacao: observacao.trim() || null })
      .eq("id", doc.id);

    if (error) {
      toast.error("Erro ao atualizar o documento.");
      console.error(error);
      setSalvando(false);
      return;
    }

    // Ao aprovar, grava a validade direto no cadastro do aluno,
    // fechando o loop que antes exigia editar o aluno manualmente.
    if (novoStatus === "aprovado") {
      const { error: alunoError } = await supabase
        .from("alunos")
        .update({ [campoValidade]: validade })
        .eq("id", doc.aluno_id);

      if (alunoError) {
        console.error(alunoError);
        toast.error(
          "Documento aprovado, mas houve erro ao atualizar a validade no cadastro do aluno. Atualize manualmente em Alunos."
        );
        setSalvando(false);
        onSaved();
        return;
      }
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
          {/* Preview / link do arquivo */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-accent/20 px-3 py-2.5">
            <p className="truncate text-sm text-muted-foreground">{doc.nome_arquivo}</p>
            <a href={doc.url} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                Abrir
              </Button>
            </a>
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