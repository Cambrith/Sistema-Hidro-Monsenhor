import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

export default defineConfig({
  plugins: [nitro()],
  tanstackStart: {
    server: { entry: "server" },
    router: { routesDirectory: "rotas" },
  },
  vite: {
    define: {
      // A Vercel expõe VERCEL_GIT_COMMIT_SHA só no ambiente de build, não pro
      // cliente — sem isso, o Diagnóstico do Sistema não teria como mostrar
      // qual commit está de fato em produção.
      "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA ?? ""),
    },
    css: {
      transformer: "lightningcss",
      lightningcss: {
        // Gera fallback automático pra oklch()/color-mix() (usados pelo tema
        // e pelo motor do Tailwind v4) no piso real de compatibilidade do
        // projeto: Chrome 109, última versão que roda em Windows 7.
        targets: browserslistToTargets(browserslist()),
      },
    },
  },
});
