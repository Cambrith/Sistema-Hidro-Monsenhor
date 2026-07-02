import { createFileRoute } from "@tanstack/react-router";
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
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/documentos")({
  head: () => ({ meta: [{ title: "Documentos — Portal do Aluno" }] }),
  component: PortalDocumentos,
});

type DadosAluno = {
  atestado_validade: string | null;
};

type Documento = {
  id: string;
  tipo: string;
  nome_arquivo: string;
  status: string;
  observacao: string | null;
  criado_em: string;
};

function formatarData(data?: string | null) {
  if (!data) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return "—";
}

function formatarDataHora(data?: string | null) {
  if (!data) return "—";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function atestadoStatus(validade?: string | null) {
  if (!validade) return "ausente";
  const diff = (new Date(validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "vencido";
  if (diff <= 30) return "vencendo";
  return "ok";
}

const statusDocCfg: Record<string, { label: string; cor: string; bg: string; icon: typeof CheckCircle2 }> = {
  pendente:  { label: "Aguardando análise", cor: "text-yellow-700", bg: "border-yellow-200 bg-yellow-50", icon: Clock },
  aprovado:  { label: "Aprovado",           cor: "text-green-700",  bg: "border-green-200 bg-green-50",  icon: CheckCircle2 },
  rejeitado: { label: "Rejeitado",          cor: "text-red-700",    bg: "border-red-200 bg-red-50",      icon: XCircle },
};

function CardUpload({
  tipo,
  label,
  descricao,
  documentos,
  onEnviar,
}: {
  tipo: string;
  label: string;
  descricao: string;
  documentos: Documento[];
  onEnviar: (tipo: string, arquivo: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const docsDoTipo = documentos.filter((d) => d.tipo === tipo);
  const ultimo = docsDoTipo[0] ?? null;

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const maxMB = 10;
    if (arquivo.size > maxMB * 1024 * 1024) {
      toast.error(`O arquivo deve ter no máximo ${maxMB}MB.`);
      return;
    }

    const tiposPermitidos = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!tiposPermitidos.includes(arquivo.type)) {
      toast.error("Envie um arquivo PDF, JPG ou PNG.");
      return;
    }

    setEnviando(true);
    await onEnviar(tipo, arquivo);
    setEnviando(false);

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          {label}
        </CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ultimo && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Último envio
            </p>
            <div className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-sm ${statusDocCfg[ultimo.status]?.bg ?? "border-border bg-accent/20"}`}>
              {(() => {
                const cfg = statusDocCfg[ultimo.status];
                if (!cfg) return null;
                const Icon = cfg.icon;
                return <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.cor}`} />;
              })()}
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${statusDocCfg[ultimo.status]?.cor ?? ""}`}>
                  {statusDocCfg[ultimo.status]?.label ?? ultimo.status}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {ultimo.nome_arquivo}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Enviado em {formatarDataHora(ultimo.criado_em)}
                </p>
                {ultimo.observacao && (
                  <p className="mt-1.5 rounded-md border border-border bg-white/60 px-2 py-1.5 text-xs text-foreground/80">
                    <strong>Observação da equipe:</strong> {ultimo.observacao}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleArquivo}
            disabled={enviando}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={enviando}
            onClick={() => inputRef.current?.click()}
          >
            {enviando ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {ultimo ? "Enviar novo" : "Enviar arquivo"}
              </>
            )}
          </Button>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            PDF, JPG ou PNG · máx. 10MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PortalDocumentos() {
  const sessao = getSessaoAluno();
  const [aluno, setAluno] = useState<DadosAluno | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (sessao) carregarDados();
  }, []);

  async function carregarDados() {
    if (!sessao) return;
    setCarregando(true);

    const [{ data: dadosAluno }, { data: docs }] = await Promise.all([
      supabase.from("alunos").select("atestado_validade").eq("id", sessao.id).maybeSingle(),
      supabase
        .from("documentos_aluno")
        .select("id, tipo, nome_arquivo, status, observacao, criado_em")
        .eq("aluno_id", sessao.id)
        .order("criado_em", { ascending: false }),
    ]);

    setAluno(dadosAluno as DadosAluno | null);
    setDocumentos((docs ?? []) as Documento[]);
    setCarregando(false);
  }

  async function enviarDocumento(tipo: string, arquivo: File) {
    if (!sessao) return;

    const ext = arquivo.name.split(".").pop();
    const nomeArquivo = `${sessao.id}/${tipo}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("documentos-aluno")
      .upload(nomeArquivo, arquivo, { upsert: false });

    if (uploadError) {
      toast.error("Erro ao enviar o arquivo. Tente novamente.");
      console.error(uploadError);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("documentos-aluno")
      .getPublicUrl(nomeArquivo);

    const { error: dbError } = await supabase.from("documentos_aluno").insert({
      aluno_id: sessao.id,
      tipo,
      nome_arquivo: arquivo.name,
      url: urlData.publicUrl,
      status: "pendente",
      observacao: null,
    });

    if (dbError) {
      toast.error("Arquivo enviado, mas erro ao registrar. Contacte a secretaria.");
      console.error(dbError);
      return;
    }

    toast.success("Documento enviado! A equipe irá analisar em breve.");
    await carregarDados();
  }

  if (carregando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const statusAtestado = atestadoStatus(aluno?.atestado_validade);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-xl font-semibold">Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Envie seu atestado médico e PAR-Q para análise da equipe.
        </p>
      </div>

      {/* Alerta de atestado vencido/ausente */}
      {(statusAtestado === "vencido" || statusAtestado === "ausente" || statusAtestado === "vencendo") && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
          statusAtestado === "vencendo"
            ? "border-yellow-300 bg-yellow-50 text-yellow-700"
            : "border-red-300 bg-red-50 text-red-700"
        }`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {statusAtestado === "ausente" && "Seu atestado médico não está cadastrado. Envie abaixo ou ligue: (24) 2245-2089."}
            {statusAtestado === "vencido" && `Atestado venceu em ${formatarData(aluno?.atestado_validade)}. Envie o novo documento abaixo.`}
            {statusAtestado === "vencendo" && `Atestado vence em ${formatarData(aluno?.atestado_validade)}. Envie em breve ou ligue: (24) 2245-2089.`}
          </span>
        </div>
      )}

      {/* Validade atual */}
      {aluno?.atestado_validade && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-accent/20 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Validade do atestado cadastrado</span>
          <span className={`font-medium ${
            statusAtestado === "ok" ? "text-green-700" :
            statusAtestado === "vencendo" ? "text-yellow-700" : "text-red-700"
          }`}>
            {formatarData(aluno.atestado_validade)}
          </span>
        </div>
      )}

      {/* Cards de upload */}
      <CardUpload
        tipo="atestado"
        label="Atestado médico"
        descricao="Atestado com data vigente e assinatura do médico confirmando aptidão para atividades aquáticas."
        documentos={documentos}
        onEnviar={enviarDocumento}
      />

      <CardUpload
        tipo="parq"
        label="Formulário PAR-Q"
        descricao="Questionário de Prontidão para Atividade Física. Formulário fornecido pela secretaria do centro."
        documentos={documentos}
        onEnviar={enviarDocumento}
      />

      {/* Instruções */}
      <Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base">Sobre a renovação</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3 text-sm text-foreground/80">
  <p>
    Os documentos devem ser renovados anualmente, preferencialmente no{" "}
    <strong>1º dia letivo do ano</strong>. Após o envio, a equipe irá
    analisar e atualizar sua situação no sistema.
  </p>
  <p>
    Com dúvidas ou problemas, você pode ligar para a secretaria ou comparecer presencialmente.
  </p>
  <div className="rounded-lg border border-border bg-accent/20 p-3">
    
      <a href="tel:+552422452089"
      className="text-base font-semibold text-primary hover:underline"
    >
      (24) 2245-2089
    </a>
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      {[
        { dias: "Seg e Qui", horario: "08h–16h" },
        { dias: "Ter e Qua", horario: "13h–21h" },
        { dias: "Sexta", horario: "07h–15h" },
      ].map((h) => (
        <div key={h.dias} className="rounded-md border border-border bg-background px-2 py-1.5 text-center">
          <p className="text-[11px] font-medium text-foreground">{h.dias}</p>
          <p className="text-[11px] text-muted-foreground">{h.horario}</p>
        </div>
      ))}
    </div>
  </div>
</CardContent>
</Card>
    </div>
  );
}