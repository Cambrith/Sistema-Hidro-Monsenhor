const CHAVE_RELOAD_UNICO = "hidro-monsenhor:sw-recarregou";

/**
 * Registra o service worker do Portal do Aluno ou do Painel administrativo,
 * com escopo restrito à respectiva área — sem isso, o SW registrado por
 * qualquer um dos dois passa a controlar o site público inteiro (achado de
 * auditoria: PWA "vazando" pra fora de /portal e /painel).
 *
 * Quando uma nova versão do service worker assume o controle da página
 * (ex: o app foi atualizado no ar), recarregamos a página uma única vez
 * pra garantir que o usuário está vendo os arquivos mais novos — sem isso,
 * o app pode ficar "preso" numa versão antiga em cache no celular.
 *
 * O guard via sessionStorage evita loop infinito de reload caso algo dê
 * errado no controllerchange.
 */
export function registrarServiceWorker(app: "portal" | "painel") {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const scope = app === "portal" ? "/portal" : "/painel";

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope }).catch((erro) => {
      console.error("Falha ao registrar o service worker:", erro);
    });
  });

  let jaRecarregou = false;
  try {
    jaRecarregou = sessionStorage.getItem(CHAVE_RELOAD_UNICO) === "1";
  } catch {
    // sessionStorage indisponível — segue sem a proteção extra, sem quebrar nada.
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (jaRecarregou) return;
    try {
      sessionStorage.setItem(CHAVE_RELOAD_UNICO, "1");
    } catch {
      // segue mesmo assim
    }
    window.location.reload();
  });
}
