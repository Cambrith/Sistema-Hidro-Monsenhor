import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSessaoAluno } from "@/utilitarios/autenticacao-aluno";
import { somDeAvisoAtivo, definirSomDeAviso, tocarSomDeAviso } from "@/utilitarios/som-aviso";
import { pushSuportado, inscricaoPushAtual, ativarPush, desativarPush } from "@/utilitarios/push-avisos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Switch } from "@/componentes/ui/switch";
import { Bell, Volume2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/configuracoes")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    if (!(await getSessaoAluno())) throw redirect({ to: "/portal" });
  },
  head: () => ({ meta: [{ title: "Configurações — Portal do Aluno" }] }),
  component: PortalConfiguracoes,
});

function PortalConfiguracoes() {
  const [alunoId, setAlunoId] = useState<string | null>(null);
  const [somAtivo, setSomAtivo] = useState(false);
  const [pushAtivo, setPushAtivo] = useState(false);
  const [carregandoPush, setCarregandoPush] = useState(false);

  useEffect(() => {
    setSomAtivo(somDeAvisoAtivo());
    getSessaoAluno().then((sessao) => {
      if (!sessao) return;
      setAlunoId(sessao.id);
      inscricaoPushAtual().then((inscricao) => setPushAtivo(!!inscricao));
    });
  }, []);

  function alternarSom(ativo: boolean) {
    definirSomDeAviso(ativo);
    setSomAtivo(ativo);
    if (ativo) tocarSomDeAviso();
  }

  async function alternarPush(ativo: boolean) {
    if (!alunoId) return;
    setCarregandoPush(true);

    if (ativo) {
      const resultado = await ativarPush(alunoId);
      if (resultado.ok) {
        setPushAtivo(true);
        toast.success("Notificações no celular ativadas.");
      } else {
        toast.error(resultado.erro ?? "Não foi possível ativar as notificações.");
      }
    } else {
      await desativarPush(alunoId);
      setPushAtivo(false);
      toast.success("Notificações no celular desativadas.");
    }

    setCarregandoPush(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8 lg:p-10">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Preferências de notificação do portal.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Volume2 className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Som ao receber avisos</CardTitle>
              <CardDescription className="mt-1 max-w-sm">
                Toca um alerta sonoro quando um aviso novo chegar com o portal aberto nesta aba.
              </CardDescription>
            </div>
          </div>
          <Switch checked={somAtivo} onCheckedChange={alternarSom} />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Notificações no celular</CardTitle>
              <CardDescription className="mt-1 max-w-sm">
                Recebe um alerta mesmo com o app fechado, só pra avisos marcados como urgentes
                (ex.: aula cancelada). Precisa instalar o app na tela de início pra funcionar
                no iPhone (iOS 16.4 ou mais recente).
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={pushAtivo}
            disabled={carregandoPush || !pushSuportado()}
            onCheckedChange={alternarPush}
          />
        </CardHeader>
        {!pushSuportado() && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Este navegador ou dispositivo não suporta notificações push. Você continua
              recebendo os avisos normalmente ao abrir o portal.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
