import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/utilitarios/supabase";
import { InfoCard } from "@/componentes/diagnostico-info-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Rocket, Smartphone, KeyRound, Timer, CheckCircle2, MinusCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/painel/aplicacao")({
  head: () => ({ meta: [{ title: "Aplicação / Deploy" }] }),
  component: AplicacaoDeploy,
});

const VARS_CLIENTE = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_VAPID_PUBLIC_KEY"] as const;

const labelVarAmbiente: Record<string, string> = {
  VITE_SUPABASE_URL: "URL do Supabase (cliente)",
  VITE_SUPABASE_ANON_KEY: "Chave anônima do Supabase (cliente)",
  VITE_VAPID_PUBLIC_KEY: "Chave pública VAPID (cliente)",
  VAPID_PUBLIC_KEY: "Chave pública VAPID (Edge Function)",
  VAPID_PRIVATE_KEY: "Chave privada VAPID (Edge Function)",
  VAPID_SUBJECT: "Assunto VAPID / e-mail de contato (Edge Function)",
};

type StatusServiceWorker = {
  suportado: boolean;
  estado: string | null;
  escopo: string | null;
  versaoCache: string | null;
};

function StatusItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
      ) : (
        <MinusCircle className="h-4 w-4 shrink-0 text-red-600" />
      )}
      <span>{label}</span>
    </div>
  );
}

function AplicacaoDeploy() {
  const [swStatus, setSwStatus] = useState<StatusServiceWorker | null>(null);
  const [secretsServidor, setSecretsServidor] = useState<Record<string, boolean> | null>(null);
  const [erroSecrets, setErroSecrets] = useState(false);
  const [tempos, setTempos] = useState<{ nome: string; ms: number }[] | null>(null);
  const [carregandoTempos, setCarregandoTempos] = useState(true);

  const commitSha = (import.meta.env.VITE_COMMIT_SHA as string | undefined) || "";

  useEffect(() => {
    carregarServiceWorker();
    carregarSecretsServidor();
    medirTempos();
  }, []);

  async function carregarServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      setSwStatus({ suportado: false, estado: null, escopo: null, versaoCache: null });
      return;
    }

    const registro = await navigator.serviceWorker.getRegistration();
    const estado =
      registro?.active?.state ?? registro?.installing?.state ?? registro?.waiting?.state ?? null;

    let versaoCache: string | null = null;
    try {
      const texto = await fetch("/service-worker.js").then((r) => r.text());
      versaoCache = /CACHE_VERSION\s*=\s*"([^"]+)"/.exec(texto)?.[1] ?? null;
    } catch {
      // Sem rede/arquivo indisponível — mantém null, sem inventar versão.
    }

    setSwStatus({
      suportado: true,
      estado,
      escopo: registro?.scope ?? null,
      versaoCache,
    });
  }

  async function carregarSecretsServidor() {
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean;
      secrets?: Record<string, boolean>;
    }>("diagnostico-ambiente");

    if (error || !data?.ok) {
      setErroSecrets(true);
      return;
    }
    setSecretsServidor(data.secrets ?? null);
  }

  async function medirTempos() {
    setCarregandoTempos(true);
    const chamadas: { nome: string; fn: () => Promise<unknown> }[] = [
      {
        nome: "diagnostico_saude_operacional",
        fn: async () => await supabase.rpc("diagnostico_saude_operacional"),
      },
      {
        nome: "diagnostico_contagem_tabelas",
        fn: async () => await supabase.rpc("diagnostico_contagem_tabelas"),
      },
    ];

    const resultados = [];
    for (const chamada of chamadas) {
      const inicio = performance.now();
      await chamada.fn();
      resultados.push({ nome: chamada.nome, ms: Math.round(performance.now() - inicio) });
    }

    setTempos(resultados);
    setCarregandoTempos(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Deploy atual
          </CardTitle>
          <CardDescription>Identificação do build em produção.</CardDescription>
        </CardHeader>
        <CardContent>
          <InfoCard
            icon={Rocket}
            label="Commit em produção (VERCEL_GIT_COMMIT_SHA)"
            valor={commitSha ? commitSha.slice(0, 7) : "Não disponível"}
            sub={
              commitSha
                ? commitSha
                : "Vazio em build local — só a Vercel preenche essa variável automaticamente."
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Service Worker (PWA)
          </CardTitle>
          <CardDescription>Estado do service worker registrado nesta aba/scope.</CardDescription>
        </CardHeader>
        <CardContent>
          {!swStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !swStatus.suportado ? (
            <p className="text-sm text-muted-foreground">
              Este navegador não suporta Service Worker.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCard
                icon={Smartphone}
                label="Estado"
                valor={swStatus.estado ?? "Não registrado"}
                tone={swStatus.estado === "activated" ? "ok" : "warn"}
              />
              <InfoCard icon={Smartphone} label="Escopo" valor={swStatus.escopo ?? "—"} />
              <InfoCard
                icon={Smartphone}
                label="Versão do cache (service-worker.js)"
                valor={swStatus.versaoCache ?? "—"}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Variáveis de ambiente
          </CardTitle>
          <CardDescription>
            Só mostra se está setada ou não — o valor nunca aparece aqui.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Cliente (bundle do navegador)
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {VARS_CLIENTE.map((v) => (
                <StatusItem key={v} ok={!!import.meta.env[v]} label={labelVarAmbiente[v]} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Servidor (secrets das Edge Functions)
            </p>
            {erroSecrets ? (
              <p className="text-sm text-muted-foreground">
                Não foi possível consultar os secrets agora.
              </p>
            ) : !secretsServidor ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                {Object.entries(secretsServidor).map(([chave, setada]) => (
                  <StatusItem key={chave} ok={setada} label={labelVarAmbiente[chave] ?? chave} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Tempo de resposta
          </CardTitle>
          <CardDescription>Medido no navegador, chamando RPCs reais do painel.</CardDescription>
        </CardHeader>
        <CardContent>
          {carregandoTempos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(tempos ?? []).map((t) => (
                <InfoCard
                  key={t.nome}
                  icon={Timer}
                  label={t.nome}
                  valor={`${t.ms} ms`}
                  tone={t.ms > 1000 ? "warn" : "ok"}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
