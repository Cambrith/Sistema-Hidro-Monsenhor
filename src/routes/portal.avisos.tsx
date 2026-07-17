import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabaseAluno } from "@/lib/supabase";
import { getSessaoAluno } from "@/lib/auth-aluno";
import { AvisoMensagemHtml } from "@/lib/sanitizar-aviso";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/portal/avisos")({
  beforeLoad: async () => {
    if (!(await getSessaoAluno())) throw redirect({ to: "/portal" });
  },
  head: () => ({ meta: [{ title: "Avisos — Portal do Aluno" }] }),
  component: PortalAvisos,
});

type Aviso = {
  id: string;
  titulo: string;
  mensagem: string;
  resumo: string | null;
  data: string;
  importante: boolean;
  publico: boolean;
  ativo?: boolean;
};

function formatarData(data?: string | null) {
  if (!data) return "—";
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function PortalAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [avisoAberto, setAvisoAberto] = useState<Aviso | null>(null);

  useEffect(() => {
    carregarAvisos();
  }, []);

  async function carregarAvisos() {
    setCarregando(true);
    const { data, error } = await supabaseAluno
      .from("avisos")
      .select("*")
      .eq("ativo", true)
      .eq("visivel_portal", true)
      .order("data", { ascending: false })
      .limit(30);

    if (error) {
      console.error(error);
      setCarregando(false);
      return;
    }

    setAvisos((data ?? []) as Aviso[]);
    setCarregando(false);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div>
        <h1 className="text-xl font-semibold">Avisos</h1>
        <p className="text-sm text-muted-foreground">
          Comunicados publicados pela secretaria e pela equipe do centro.
        </p>
      </div>

      {carregando && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!carregando && avisos.length === 0 && (
        <div className="rounded-xl border border-border bg-accent/20 p-6 text-center text-sm text-muted-foreground">
          Nenhum aviso publicado no momento.
        </div>
      )}

      {!carregando && avisos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {avisos.map((aviso) => (
            <button
              key={aviso.id}
              type="button"
              onClick={() => setAvisoAberto(aviso)}
              className="group w-full text-left"
            >
              <Card className="h-full border-border/80 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Megaphone className="h-5 w-5" />
                    </span>
                    {aviso.importante && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Importante
                      </span>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{aviso.titulo}</CardTitle>
                    <CardDescription className="mt-1">{formatarData(aviso.data)}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {aviso.resumo?.trim() ||
                      (aviso.importante
                        ? "Comunicado importante — toque para conferir todos os detalhes."
                        : "Toque para conferir todos os detalhes deste comunicado.")}
                  </p>
                  <p className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                    Ler aviso completo
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!avisoAberto} onOpenChange={(open) => !open && setAvisoAberto(null)}>
        <DialogContent className="sm:max-w-lg">
          {avisoAberto && (
            <>
              <DialogHeader>
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Megaphone className="h-5 w-5" />
                  </span>
                  {avisoAberto.importante && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Importante
                    </span>
                  )}
                </div>
                <DialogTitle>{avisoAberto.titulo}</DialogTitle>
                <DialogDescription>Publicado em {formatarData(avisoAberto.data)}</DialogDescription>
              </DialogHeader>
              <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-4">
                <AvisoMensagemHtml mensagem={avisoAberto.mensagem} className="text-foreground/85" />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
