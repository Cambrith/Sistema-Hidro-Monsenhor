import * as React from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface ContextoInstalacaoPwa {
  deferredPrompt: BeforeInstallPromptEvent | null;
  limparDeferredPrompt: () => void;
}

const InstalacaoPwaContext = React.createContext<ContextoInstalacaoPwa>({
  deferredPrompt: null,
  limparDeferredPrompt: () => {},
});

/**
 * Captura o evento `beforeinstallprompt` uma única vez, no nível mais alto
 * do app (montado no root, antes de qualquer redirect de login).
 *
 * O navegador dispara esse evento uma única vez e cedo — muitas vezes antes
 * do usuário terminar o login e ser redirecionado pra dentro do portal/painel.
 * Se o listener só existisse dentro do componente do banner (que monta depois
 * do redirect), o evento já teria disparado e se perdido. Guardando aqui, o
 * banner consegue usá-lo não importa quando montar.
 */
export function ProvedorInstalacaoPwa({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(
    null,
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    function aoCapturarPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    function aoInstalar() {
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", aoCapturarPrompt);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoCapturarPrompt);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  const limparDeferredPrompt = React.useCallback(() => setDeferredPrompt(null), []);

  const value = React.useMemo(
    () => ({ deferredPrompt, limparDeferredPrompt }),
    [deferredPrompt, limparDeferredPrompt],
  );

  return (
    <InstalacaoPwaContext.Provider value={value}>{children}</InstalacaoPwaContext.Provider>
  );
}

export function useDeferredInstallPrompt() {
  return React.useContext(InstalacaoPwaContext);
}
