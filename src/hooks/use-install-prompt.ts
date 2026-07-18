import * as React from "react";
import { useDeferredInstallPrompt } from "@/utilitarios/contexto-instalacao-pwa";

const DIAS_ATE_REAPARECER = 14;

type PlataformaInstalacao = "android" | "desktop" | "ios" | null;

export function estaEmModoStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneMatch = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari expõe isso via propriedade não-padrão em vez de display-mode.
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return !!standaloneMatch || iosStandalone;
}

export function useIsStandalone(): boolean {
  const [standalone, setStandalone] = React.useState(false);

  React.useEffect(() => {
    setStandalone(estaEmModoStandalone());
    const mql = window.matchMedia("(display-mode: standalone)");
    const handler = () => setStandalone(estaEmModoStandalone());
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);

  return standalone;
}

function detectarIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS recente se identifica como Mac, mas tem suporte a touch — pega esse caso também.
  const isIPadOSDisfarcado = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return isIOSDevice || isIPadOSDisfarcado;
}
function detectarAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return /Android/i.test(window.navigator.userAgent);
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
function foiInstaladoAnteriormente(chaveInstalado: string): boolean {
  try {
    return localStorage.getItem(chaveInstalado) === "1";
  } catch {
    return false;
  }
}

function marcarComoInstalado(chaveInstalado: string): void {
  try {
    localStorage.setItem(chaveInstalado, "1");
  } catch {
    // Sem problema — na pior das hipóteses o banner volta a aparecer depois.
  }
}
/**
 * Controla a exibição do banner de instalação do PWA.
 *
 * - No Android/Chrome: consome o evento `beforeinstallprompt` capturado pelo
 *   `ProvedorInstalacaoPwa` (montado no root do app) e expõe uma função
 *   `instalar()` que dispara o prompt real do navegador. O evento é
 *   capturado globalmente, e não aqui, porque o navegador dispara ele uma
 *   única vez e cedo — muitas vezes antes do redirect de login terminar e
 *   este hook montar; capturando só no root garantimos que o evento não se
 *   perde nesse meio-tempo.
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
  const chaveInstalado = `hidro-monsenhor:ja-instalado:${app}`;
  const [plataforma, setPlataforma] = React.useState<PlataformaInstalacao>(null);
  const [podeMostrar, setPodeMostrar] = React.useState(false);
  const { deferredPrompt, limparDeferredPrompt } = useDeferredInstallPrompt();

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (estaEmModoStandalone()) {
      marcarComoInstalado(chaveInstalado);
      return;
    }

    if (foiInstaladoAnteriormente(chaveInstalado)) return;
    if (foiDispensadoRecentemente(chaveDispensado)) return;

    if (detectarIOS()) {
      setPlataforma("ios");
      setPodeMostrar(true);
      return;
    }

    if (deferredPrompt) {
      setPlataforma(detectarAndroid() ? "android" : "desktop");
      setPodeMostrar(true);
    }
  }, [chaveDispensado, chaveInstalado, deferredPrompt]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    function aoInstalar() {
      marcarComoInstalado(chaveInstalado);
      setPodeMostrar(false);
    }
    window.addEventListener("appinstalled", aoInstalar);
    return () => window.removeEventListener("appinstalled", aoInstalar);
  }, [chaveInstalado]);

  async function instalar() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // Independente da escolha, o Chrome só permite usar o evento uma vez.
    limparDeferredPrompt();
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
