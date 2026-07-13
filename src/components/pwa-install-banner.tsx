import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import logo from "@/assets/logo-simbolo.png";

interface PwaInstallBannerProps {
  /** Qual dos dois apps instaláveis este banner representa. */
  app?: "portal" | "admin";
  /** Título exibido no banner. Default cobre o caso do Portal do Aluno. */
  titulo?: string;
}

/**
 * Banner de instalação do app (Portal do Aluno ou Painel administrativo).
 *
 * Fica visível e simples de propósito — parte do público do centro é mais
 * velha, então não dá pra confiar só no navegador oferecer a instalação
 * sozinho (esse comportamento varia muito e costuma ser discreto demais).
 */
export function PwaInstallBanner({
  app = "portal",
  titulo = "Instale o app do Portal",
}: PwaInstallBannerProps) {
  const { plataforma, podeMostrar, instalar, dispensar } = useInstallPrompt(app);

  if (!podeMostrar || !plataforma) return null;

  return (
    <Card className="mx-4 mt-4 flex flex-col gap-3 border-primary/20 bg-primary/5 p-4 sm:mx-6 sm:flex-row sm:items-center sm:gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
        <img src={logo} alt="" className="h-full w-full scale-125 object-contain" />
      </span>

      <div className="flex-1">
        <p className="font-display text-sm font-semibold text-foreground">{titulo}</p>
        {plataforma === "android" ? (
          <p className="mt-0.5 text-sm text-muted-foreground">
            Acesse mais rápido, direto da tela inicial do seu celular.
          </p>
        ) : plataforma === "desktop" ? (
          <p className="mt-0.5 text-sm text-muted-foreground">
            Acesse mais rápido, direto do seu computador, sem precisar abrir o navegador.
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-muted-foreground">
            Toque em <Share className="inline size-3.5 -translate-y-0.5" aria-hidden />{" "}
            <strong className="font-medium text-foreground">Compartilhar</strong> e depois em{" "}
            <SquarePlus className="inline size-3.5 -translate-y-0.5" aria-hidden />{" "}
            <strong className="font-medium text-foreground">Adicionar à Tela de Início</strong>.
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        {(plataforma === "android" || plataforma === "desktop") && (
          <Button size="sm" onClick={instalar} className="gap-1.5">
            <Download className="size-4" aria-hidden />
            Instalar
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={dispensar}
          aria-label="Dispensar"
          className="text-muted-foreground"
        >
          {plataforma === "ios" ? "Entendi" : <X className="size-4" aria-hidden />}
        </Button>
      </div>
    </Card>
  );
}
