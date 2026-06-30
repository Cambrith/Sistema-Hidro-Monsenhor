import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessaoAluno } from "@/lib/auth-aluno";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, FileText, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/atestado")({
  head: () => ({ meta: [{ title: "Atestado — Portal do Aluno" }] }),
  component: PortalAtestado,
});

type DadosAtestado = { atestado_validade: string | null };

function formatarData(data?: string | null) {
  if (!data) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return "—";
}

function atestadoStatus(validade?: string | null) {
  if (!validade) return "ausente";
  const diff = (new Date(validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "vencido";
  if (diff <= 30) return "vencendo";
  return "ok";
}

function PortalAtestado() {
  const sessao = getSessaoAluno();
  const [dados, setDados] = useState<DadosAtestado | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { if (sessao) carregarDados(); }, []);

  async function carregarDados() {
    if (!sessao) return;
    setCarregando(true);
    const { data, error } = await supabase
      .from("alunos").select("atestado_validade")
      .eq("id", sessao.id).maybeSingle();
    if (error || !data) { toast.error("Erro ao carregar informações do atestado."); setCarregando(false); return; }
    setDados(data as DadosAtestado);
    setCarregando(false);
  }

  if (carregando) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (!dados) return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Não foi possível carregar as informações.</p>
        <Button className="mt-4" onClick={carregarDados}>Tentar novamente</Button>
      </div>
    </div>
  );

  const status = atestadoStatus(dados.atestado_validade);

  const cfg = {
    ok:       { icon: CheckCircle2,  cor: "text-green-700",  bg: "border-green-300 bg-green-50",   label: "Em dia",             msg: "Seu atestado médico está válido." },
    vencendo: { icon: AlertTriangle, cor: "text-yellow-700", bg: "border-yellow-300 bg-yellow-50", label: "Vencendo em breve",  msg: `Vence em ${formatarData(dados.atestado_validade)}. Providencie a renovação.` },
    vencido:  { icon: XCircle,       cor: "text-red-700",    bg: "border-red-300 bg-red-50",       label: "Vencido",            msg: `Venceu em ${formatarData(dados.atestado_validade)}. Renove o quanto antes.` },
    ausente:  { icon: XCircle,       cor: "text-red-700",    bg: "border-red-300 bg-red-50",       label: "Não cadastrado",     msg: "Atestado não está cadastrado no sistema. Procure a secretaria." },
  }[status];

  const Icon = cfg.icon;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-xl font-semibold">Atestado médico</h1>
        <p className="text-sm text-muted-foreground">Situação e validade do seu atestado cadastrado.</p>
      </div>

      <div className={`flex items-start gap-3 rounded-xl border px-4 py-4 ${cfg.bg}`}>
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.cor}`} />
        <div>
          <p className={`font-semibold ${cfg.cor}`}>{cfg.label}</p>
          <p className={`mt-0.5 text-sm ${cfg.cor}`}>{cfg.msg}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Detalhes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">Validade cadastrada</span>
            <span className={`font-medium ${cfg.cor}`}>
              {dados.atestado_validade ? formatarData(dados.atestado_validade) : "Não cadastrado"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Situação</span>
            <span className={`font-medium ${cfg.cor}`}>{cfg.label}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como renovar</CardTitle>
          <CardDescription>Processo de renovação anual do atestado médico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/80">
          <p>A renovação deve ser feita presencialmente na secretaria, preferencialmente no <strong>1º dia letivo do ano</strong>.</p>
          <p>Você precisará de:</p>
          <ul className="space-y-1.5 pl-4">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Atestado médico atualizado com data vigente e assinatura do médico
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Formulário PAR-Q preenchido (fornecido pela secretaria)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Documento de identificação com foto
            </li>
          </ul>
          <div className="mt-2 rounded-lg border border-border bg-accent/20 px-3 py-2.5 text-xs text-muted-foreground">
            <strong className="text-foreground">Secretaria:</strong> Seg 08h–16h · Ter e Qua 13h–21h · Qui 08h–16h · Sex 07h–15h · Tel: (24) 2245-2089
          </div>
        </CardContent>
      </Card>
    </div>
  );
}