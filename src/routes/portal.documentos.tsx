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
  tipo: "atestado" | "parq";
  status: StatusDoc;
  arquivo_url: string | null;
  observacao: string | null;
  criado_em: string;
  validade?: string | null;
};

function formatarData(iso?: string | null) {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return "—";
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
  const [enviando, setEnviando] = useState<"atestado" | "parq" | null>(null);
  const refAtestado = useRef<HTMLInputElement>(null);
  const refParq = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.id) carregarDocumentos();
  }, [session?.id]);

  async function carregarDocumentos() {
    setCarregando(true);
    const { data, error } = await supabase
      .from("documentos_aluno")
      .select("*")
      .eq("aluno_id", session!.id)
      .order("criado_em", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar documentos.");
    } else {
      setDocumentos((data ?? []) as Documento[]);
    }
    setCarregando(false);
  }

  async function enviarDocumento(
    tipo: "atestado" | "parq",
    arquivo: File,
  ) {
    if (!session?.id) return;
    setEnviando(tipo);

    try {
      const ext = arquivo.name.split(".").pop();
      const caminho = `${session.id}/${tipo}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos-aluno")
        .upload(caminho, arquivo, { upsert: false });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("documentos_aluno")
        .insert({
          aluno_id: session.id,
          tipo,
          arquivo_url: caminho,
          status: "pendente",
        });

      if (insertError) throw insertError;

      toast.success(
        tipo === "atestado"
          ? "Atestado enviado! A secretaria analisará em breve."
          : "PAR-Q enviado! A secretaria analisará em breve.",
      );

      await carregarDocumentos();
    } catch {
      toast.error("Erro ao enviar o documento. Tente novamente.");
    } finally {
      setEnviando(null);
    }
  }

  const ultimoAtestado = documentos.find((d) => d.tipo === "atestado");
  const ultimoParq = documentos.find((d) => d.tipo === "parq");

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

      {/* Aviso de renovação */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6 text-sm text-blue-900">
          <p>
            <strong>Renovação anual obrigatória:</strong> o atestado médico e o
            PAR-Q devem ser atualizados todo ano no 1º dia letivo. Use esta
            página para enviar os documentos atualizados à secretaria.
          </p>
        </CardContent>
      </Card>

      {/* PAR-Q — vem primeiro */}
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
              </p>
              {ultimoParq.observacao && (
                <p className="mt-1 text-muted-foreground">
                  Observação da equipe: <strong>{ultimoParq.observacao}</strong>
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
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) enviarDocumento("parq", arquivo);
              e.target.value = "";
            }}
          />

          <Button
            size="sm"
            variant="outline"
            onClick={() => refParq.current?.click()}
            disabled={enviando !== null}
          >
            <Upload className="mr-2 h-4 w-4" />
            {enviando === "parq" ? "Enviando..." : ultimoParq ? "Enviar novo PAR-Q" : "Enviar PAR-Q"}
          </Button>
        </CardContent>
      </Card>

      {/* Atestado médico — vem depois */}
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
              {ultimoAtestado.validade && (
                <p className="text-muted-foreground">
                  Validade: <strong>{formatarData(ultimoAtestado.validade)}</strong>
                </p>
              )}
              {ultimoAtestado.observacao && (
                <p className="mt-1 text-muted-foreground">
                  Observação da equipe:{" "}
                  <strong>{ultimoAtestado.observacao}</strong>
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
              const arquivo = e.target.files?.[0];
              if (arquivo) enviarDocumento("atestado", arquivo);
              e.target.value = "";
            }}
          />

          <Button
            size="sm"
            variant="outline"
            onClick={() => refAtestado.current?.click()}
            disabled={enviando !== null}
          >
            <Upload className="mr-2 h-4 w-4" />
            {enviando === "atestado"
              ? "Enviando..."
              : ultimoAtestado
                ? "Enviar novo atestado"
                : "Enviar atestado"}
          </Button>
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
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enviado em {formatarData(doc.criado_em)}
                      </p>
                    </div>
                    <BadgeStatus status={doc.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Link para canais */}
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