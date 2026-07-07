import * as React from "react";

const DIAS_ATE_REAPARECER = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PlataformaInstalacao = "android" | "ios" | null;

function estaEmModoStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneMatch = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari expõe isso via propriedade não-padrão em vez de display-mode.
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return !!standaloneMatch || iosStandalone;
}

function detectarIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS recente se identifica como Mac, mas tem suporte a touch — pega esse caso também.
  const isIPadOSDisfarcado =
    ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return isIOSDevice || isIPadOSDisfarcado;
}

function foiDispensadoRecentemente(chaveDispensado: string): boolean {
  try {
    const valor = localStorage.getItem(chaveDispensado);
    if (!valor) return false;
    const dispensadoEm = Number(valor);
    const diasPassados = (Date.now() - dispensadoEm) / (1000 * 60 * 60 * 24);
    return diasPassados < DIAS_ATE_REAPARECER;
  } catch {
    // Se localStorage não estiver disponível (modo privado etc.), não bloqueia o banner.
    return false;
  }
}

/**
 * Controla a exibição do banner de instalação do PWA.
 *
 * - No Android/Chrome: captura o evento nativo `beforeinstallprompt` e expõe
 *   uma função `instalar()` que dispara o prompt real do navegador.
 * - No iOS Safari: não existe evento nativo, então só sinalizamos que a
 *   plataforma é iOS pra UI mostrar a instrução manual ("Compartilhar" →
 *   "Adicionar à Tela de Início").
 * - Se o app já estiver instalado (rodando em modo standalone), ou se o
 *   usuário já dispensou o banner recentemente, o banner fica oculto.
 *
 * @param app - Existem dois apps instaláveis (portal do aluno e painel
 * administrativo). Cada um guarda sua própria dispensa em localStorage, pra
 * dispensar um não esconder o outro.
 */
export function useInstallPrompt(app: "portal" | "admin" = "portal") {
  const chaveDispensado = `hidro-monsenhor:install-dispensado-em:${app}`;

  const [plataforma, setPlataforma] = React.useState<PlataformaInstalacao>(null);
  const [podeMostrar, setPodeMostrar] = React.useState(false);
  const deferredPromptRef = React.useRef<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (estaEmModoStandalone()) return;
    if (foiDispensadoRecentemente(chaveDispensado)) return;

    if (detectarIOS()) {
      setPlataforma("ios");
      setPodeMostrar(true);
      return;
    }

    function aoCapturarPrompt(event: Event) {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setPlataforma("android");
      setPodeMostrar(true);
    }

    window.addEventListener("beforeinstallprompt", aoCapturarPrompt);

    function aoInstalar() {
      setPodeMostrar(false);
      deferredPromptRef.current = null;
    }
    window.addEventListener("appinstalled", aoInstalar);

    return () => {
      window.removeEventListener("beforeinstallprompt", aoCapturarPrompt);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, [chaveDispensado]);

  async function instalar() {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    // Independente da escolha, o Chrome só permite usar o evento uma vez.
    deferredPromptRef.current = null;
    setPodeMostrar(false);
  }

  function dispensar() {
    try {
      localStorage.setItem(chaveDispensado, String(Date.now()));
    } catch {
      // Sem problema se não conseguir salvar — o banner só reaparece na próxima visita.
    }
    setPodeMostrar(false);
  }

  return { plataforma, podeMostrar, instalar, dispensar };
}
