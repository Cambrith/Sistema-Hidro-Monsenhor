import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessaoAluno } from "@/lib/auth-aluno";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/documentos")({
  head: () => ({ meta: [{ title: "Documentos — Portal do Aluno" }] }),
  component: PortalDocumentos,
});

type StatusDoc = "pendente" | "aprovado" | "rejeitado";

type Documento = {
  id: string;
  tipo: "atestado" | "par_q";
  status: StatusDoc;
  nome_arquivo: string[] | null;
  url: string[] | null;
  observacao: string | null;
  criado_em: string;
};

const TIPOS_ACEITOS = ["image/png", "image/jpeg", "application/pdf"];
const TAMANHO_MAXIMO_MB = 5;
const TAMANHO_MAXIMO_BYTES = TAMANHO_MAXIMO_MB * 1024 * 1024;
const MAX_ARQUIVOS_PARQ = 2;

const TEXTO_RESTRICOES = `Formatos aceitos: PNG, JPG ou PDF. Tamanho máximo: ${TAMANHO_MAXIMO_MB}MB por arquivo.`;
const TEXTO_RESTRICOES_PARQ = `${TEXTO_RESTRICOES} Você pode anexar até 2 fotos (frente e verso) ou 1 única foto com as duas partes visíveis.`;

function formatarData(iso?: string | null) {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return "—";
}

function validarArquivo(arquivo: File): string | null {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return "Formato não aceito. Envie um arquivo PNG, JPG ou PDF.";
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return `Arquivo muito grande. O limite é ${TAMANHO_MAXIMO_MB}MB.`;
  }
  return null;
}

function mensagemErroEnvio(erro: unknown): string {
  const msg = erro instanceof Error ? erro.message : "";
  if (msg.includes("pendente desse tipo")) {
    return "Você já tem um envio pendente desse tipo. Cancele-o antes de enviar outro.";
  }
  if (msg.includes("Limite de envios diários")) {
    return "Limite de envios diários atingido. Tente novamente amanhã.";
  }
  return "Erro ao enviar o documento. Tente novamente.";
}

function BadgeStatus({ status }: { status: StatusDoc }) {
  if (status === "aprovado")
    return (
      <Badge className="gap-1 bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3" />
        Aprovado
      </Badge>
    );
  if (status === "rejeitado")
    return (
      <Badge className="gap-1 bg-red-100 text-red-800">
        <XCircle className="h-3 w-3" />
        Rejeitado
      </Badge>
    );
  return (
    <Badge className="gap-1 bg-yellow-100 text-yellow-800">
      <Clock className="h-3 w-3" />
      Aguardando análise
    </Badge>
  );
}

function PortalDocumentos() {
  const session = getSessaoAluno();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState<"atestado" | "par_q" | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const refAtestado = useRef<HTMLInputElement>(null);
  const refParq = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.id) carregarDocumentos();
  }, [session?.id]);

  async function carregarDocumentos() {
    setCarregando(true);
    const { data, error } = await supabase.rpc("portal_documentos_aluno", {
      p_aluno_id: session!.id,
    });

    if (error) {
      toast.error("Erro ao carregar documentos.");
    } else {
      setDocumentos((data ?? []) as Documento[]);
    }
    setCarregando(false);
  }

  async function enviarDocumento(tipo: "atestado" | "par_q", arquivos: File[]) {
    if (!session?.id || arquivos.length === 0) return;

    if (tipo === "par_q" && arquivos.length > MAX_ARQUIVOS_PARQ) {
      toast.error(`Selecione no máximo ${MAX_ARQUIVOS_PARQ} arquivos.`);
      return;
    }

    for (const arquivo of arquivos) {
      const erroValidacao = validarArquivo(arquivo);
      if (erroValidacao) {
        toast.error(erroValidacao);
        return;
      }
    }

    setEnviando(tipo);

    try {
      const caminhos: string[] = [];
      const nomes: string[] = [];

      for (const arquivo of arquivos) {
        const ext = arquivo.name.split(".").pop();
        const caminho = `${session.id}/${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("documentos-aluno")
          .upload(caminho, arquivo, { upsert: false });

        if (uploadError) throw uploadError;

        caminhos.push(caminho);
        nomes.push(arquivo.name);
      }

      const { error: insertError } = await supabase.rpc("portal_enviar_documento", {
        p_aluno_id: session.id,
        p_tipo: tipo,
        p_nomes_arquivo: nomes,
        p_urls: caminhos,
      });

      if (insertError) throw insertError;

      toast.success(
        tipo === "atestado"
          ? "Atestado enviado! A secretaria analisará em breve."
          : "PAR-Q enviado! A secretaria analisará em breve.",
      );

      await carregarDocumentos();
    } catch (erro) {
      toast.error(mensagemErroEnvio(erro));
    } finally {
      setEnviando(null);
    }
  }

  async function cancelarDocumento(doc: Documento) {
    if (!session?.id) return;

    const confirmar = window.confirm(
      "Tem certeza que deseja cancelar este envio? Essa ação não pode ser desfeita.",
    );
    if (!confirmar) return;

    setCancelando(doc.id);

    try {
      const { data, error } = await supabase.rpc("portal_cancelar_documento", {
        p_aluno_id: session.id,
        p_documento_id: doc.id,
      });

      if (error) throw error;

      const urlsArquivos = data?.[0]?.url;
      if (urlsArquivos?.length) {
        await supabase.storage.from("documentos-aluno").remove(urlsArquivos);
      }

      toast.success("Envio cancelado.");
      await carregarDocumentos();
    } catch {
      toast.error("Erro ao cancelar o envio. Tente novamente.");
    } finally {
      setCancelando(null);
    }
  }

  const ultimoAtestado = documentos.find((d) => d.tipo === "atestado");
  const ultimoParq = documentos.find((d) => d.tipo === "par_q");
  const temPendenteAtestado = ultimoAtestado?.status === "pendente";
  const temPendenteParq = ultimoParq?.status === "pendente";

  if (!session) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div>
        <h2 className="font-display text-xl font-semibold">Documentos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie seus documentos de renovação anual sem precisar comparecer
          presencialmente à secretaria. A equipe responsável analisará e
          aprovará em breve.
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6 text-sm text-blue-900">
          <p>
            <strong>Renovação anual obrigatória:</strong> o atestado médico e o
            PAR-Q devem ser atualizados todo ano no 1º dia letivo. Use esta
            página para enviar os documentos atualizados à secretaria.
          </p>
        </CardContent>
      </Card>

      {/* PAR-Q */}
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Formulário PAR-Q</CardTitle>
            </div>
            {ultimoParq && <BadgeStatus status={ultimoParq.status} />}
          </div>
          <CardDescription>
            Questionário de prontidão para atividade física. Deve ser
            preenchido e assinado anualmente.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {ultimoParq ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">
                Último envio: <strong>{formatarData(ultimoParq.criado_em)}</strong>
                {ultimoParq.url && ultimoParq.url.length > 1 && (
                  <span> · {ultimoParq.url.length} arquivos</span>
                )}
              </p>
              {ultimoParq.observacao && (
                <p className="mt-1 text-muted-foreground">
                  Observação da equipe: <strong>{ultimoParq.observacao}</strong>
                </p>
              )}
              {temPendenteParq && (
                <p className="mt-1 text-xs text-yellow-700">
                  Cancele o envio pendente antes de mandar um novo.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum PAR-Q enviado ainda.
            </p>
          )}

          <input
            ref={refParq}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            className="hidden"
            onChange={(e) => {
              const arquivos = Array.from(e.target.files ?? []);
              if (arquivos.length) enviarDocumento("par_q", arquivos);
              e.target.value = "";
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refParq.current?.click()}
              disabled={enviando !== null || temPendenteParq}
            >
              <Upload className="mr-2 h-4 w-4" />
              {enviando === "par_q" ? "Enviando..." : ultimoParq ? "Enviar novo PAR-Q" : "Enviar PAR-Q"}
            </Button>

            {temPendenteParq && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => cancelarDocumento(ultimoParq!)}
                disabled={cancelando === ultimoParq!.id}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {cancelando === ultimoParq!.id ? "Cancelando..." : "Cancelar envio"}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{TEXTO_RESTRICOES_PARQ}</p>
        </CardContent>
      </Card>

      {/* Atestado médico */}
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Atestado médico</CardTitle>
            </div>
            {ultimoAtestado && <BadgeStatus status={ultimoAtestado.status} />}
          </div>
          <CardDescription>
            Deve comprovar aptidão física para a modalidade praticada e
            estar atualizado com data vigente.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {ultimoAtestado ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">
                Último envio:{" "}
                <strong>{formatarData(ultimoAtestado.criado_em)}</strong>
              </p>
              {ultimoAtestado.observacao && (
                <p className="mt-1 text-muted-foreground">
                  Observação da equipe:{" "}
                  <strong>{ultimoAtestado.observacao}</strong>
                </p>
              )}
              {temPendenteAtestado && (
                <p className="mt-1 text-xs text-yellow-700">
                  Cancele o envio pendente antes de mandar um novo.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum atestado enviado ainda.
            </p>
          )}

          <input
            ref={refAtestado}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const arquivos = Array.from(e.target.files ?? []);
              if (arquivos.length > 1) {
                toast.error("Selecione apenas um arquivo para o atestado.");
                e.target.value = "";
                return;
              }
              if (arquivos[0]) enviarDocumento("atestado", [arquivos[0]]);
              e.target.value = "";
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refAtestado.current?.click()}
              disabled={enviando !== null || temPendenteAtestado}
            >
              <Upload className="mr-2 h-4 w-4" />
              {enviando === "atestado"
                ? "Enviando..."
                : ultimoAtestado
                  ? "Enviar novo atestado"
                  : "Enviar atestado"}
            </Button>

            {temPendenteAtestado && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => cancelarDocumento(ultimoAtestado!)}
                disabled={cancelando === ultimoAtestado!.id}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {cancelando === ultimoAtestado!.id ? "Cancelando..." : "Cancelar envio"}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{TEXTO_RESTRICOES}</p>
        </CardContent>
      </Card>

      {/* Histórico */}
      {documentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de envios</CardTitle>
            <CardDescription>
              Todos os documentos enviados anteriormente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="space-y-2">
                {documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {doc.tipo === "atestado" ? "Atestado médico" : "PAR-Q"}
                        {doc.url && doc.url.length > 1 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({doc.url.length} arquivos)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enviado em {formatarData(doc.criado_em)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeStatus status={doc.status} />
                      {doc.status === "pendente" && (
                        <button
                          type="button"
                          onClick={() => cancelarDocumento(doc)}
                          disabled={cancelando === doc.id}
                          className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                          title="Cancelar envio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p>
          Precisa de ajuda ou tem dúvidas sobre os documentos?{" "}
          <Link
            to="/"
            hash="canais-oficiais"
            className="font-medium text-primary underline underline-offset-2 inline-flex items-center gap-1"
          >
            Acesse os canais de contato do centro
            <ExternalLink className="h-3 w-3" />
          </Link>
          .
        </p>
      </div>
    </div>
  );
}