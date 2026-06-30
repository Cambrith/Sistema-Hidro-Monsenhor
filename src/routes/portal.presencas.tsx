import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessaoAluno } from "@/lib/auth-aluno";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/presencas")({
  head: () => ({ meta: [{ title: "Presenças — Portal do Aluno" }] }),
  component: PortalPresencas,
});

type Presenca = {
  id: string;
  data: string;
  status: "presente" | "falta" | "falta justificada";
};

function formatarData(data?: string | null) {
  if (!data) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return "—";
}

function nomeMes(ano: number, mes: number) {
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function PortalPresencas() {
  const sessao = getSessaoAluno();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { if (sessao) carregarPresencas(); }, [ano, mes]);

  async function carregarPresencas() {
    if (!sessao) return;
    setCarregando(true);
    const mesStr = String(mes).padStart(2, "0");
    const { data, error } = await supabase
      .from("presencas").select("id, data, status")
      .eq("aluno_id", sessao.id)
      .gte("data", `${ano}-${mesStr}-01`)
      .lte("data", `${ano}-${mesStr}-31`)
      .order("data", { ascending: false });
    if (error) toast.error("Erro ao carregar presenças.");
    setPresencas((data ?? []) as Presenca[]);
    setCarregando(false);
  }

  function mesAnterior() {
    if (mes === 1) { setMes(12); setAno((a) => a - 1); }
    else setMes((m) => m - 1);
  }

  function mesSeguinte() {
    const agora = new Date();
    if (ano === agora.getFullYear() && mes >= agora.getMonth() + 1) return;
    if (mes === 12) { setMes(1); setAno((a) => a + 1); }
    else setMes((m) => m + 1);
  }

  const eMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
  const totalFaltas = presencas.filter((p) => p.status === "falta").length;
  const faltasJustificadas = presencas.filter((p) => p.status === "falta justificada").length;
  const totalPresentes = presencas.filter((p) => p.status === "presente").length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-xl font-semibold">Presenças</h1>
        <p className="text-sm text-muted-foreground">Histórico de frequência nas aulas.</p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-accent/20 px-4 py-2.5">
        <button type="button" onClick={mesAnterior} className="rounded-md p-1 hover:bg-accent">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium capitalize">{nomeMes(ano, mes)}</span>
        <button type="button" onClick={mesSeguinte} disabled={eMesAtual} className="rounded-md p-1 hover:bg-accent disabled:opacity-30">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-accent/20 p-3 text-center">
          <p className="text-2xl font-bold">{totalPresentes}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Presenças</p>
        </div>
        <div className={`rounded-lg border p-3 text-center ${totalFaltas >= 4 ? "border-red-300 bg-red-50" : totalFaltas >= 2 ? "border-yellow-200 bg-yellow-50" : "border-border bg-accent/20"}`}>
          <p className={`text-2xl font-bold ${totalFaltas >= 4 ? "text-red-700" : totalFaltas >= 2 ? "text-yellow-700" : "text-foreground"}`}>{totalFaltas}</p>
          <p className={`mt-0.5 text-xs ${totalFaltas >= 4 ? "text-red-600" : totalFaltas >= 2 ? "text-yellow-600" : "text-muted-foreground"}`}>Faltas</p>
        </div>
        <div className="rounded-lg border border-border bg-accent/20 p-3 text-center">
          <p className="text-2xl font-bold">{faltasJustificadas}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Justificadas</p>
        </div>
      </div>

      {totalFaltas >= 4 && eMesAtual && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
          ⚠ Você atingiu o limite de faltas neste mês. Procure a secretaria o quanto antes.
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            Registro do mês
          </CardTitle>
          <CardDescription>Regra: 4 ou mais faltas sem justificativa anulam a vaga.</CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : presencas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma aula registrada neste mês.</p>
          ) : (
            <div className="space-y-2">
              {presencas.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">{formatarData(p.data)}</span>
                  <span className={`flex items-center gap-1.5 font-medium ${p.status === "presente" ? "text-green-700" : p.status === "falta justificada" ? "text-yellow-700" : "text-red-700"}`}>
                    {p.status === "presente" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {p.status === "presente" ? "Presente" : p.status === "falta justificada" ? "Justificada" : "Falta"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}