import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { registrarServiceWorker } from "@/lib/pwa";

import appCss from "../styles.css?url";

const faviconPath = "/favicon.png?v=3";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Página não encontrada
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);

  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente novamente ou volte para o início.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hidro Monsenhor" },
      {
        name: "description",
        content:
          "Sistema institucional do Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira — natação e hidroginástica em Petrópolis/RJ.",
      },
      { name: "author", content: "A.T.L.A.S." },
      { property: "og:title", content: "Hidro Monsenhor" },
      {
        property: "og:description",
        content:
          "Sistema institucional do Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira — natação e hidroginástica em Petrópolis/RJ.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:title", content: "Hidro Monsenhor" },
      {
        name: "twitter:description",
        content:
          "Sistema institucional do Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira — natação e hidroginástica em Petrópolis/RJ.",
      },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#004094" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      // apple-mobile-web-app-title fica por conta de cada layout (portal,
      // admin, login) — cada um instala como um "app" com nome diferente.
      // Ver nota sobre manifest logo abaixo.
    ],

    links: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: faviconPath,
      },
      {
        rel: "shortcut icon",
        type: "image/png",
        href: faviconPath,
      },
      {
        rel: "apple-touch-icon",
        href: "/icons/apple-touch-icon.png",
      },
      // Sem <link rel="manifest"> aqui de propósito: existem dois apps
      // instaláveis (Portal do Aluno e Painel administrativo), cada um com
      // seu próprio manifest.json e escopo. Declarar um manifest fixo aqui
      // faria ele "vazar" pra área errada. Cada layout (portal.tsx,
      // _admin.tsx, login.tsx) declara o seu via head().
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>

      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registrarServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors closeButton />
    </QueryClientProvider>
  );
}