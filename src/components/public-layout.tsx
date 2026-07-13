import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-simbolo.png";

const nav = [
  { to: "/", label: "Início" },
  { to: "/avisos", label: "Avisos" },
  { to: "/acesso-rapido", label: "Dúvidas Frequentes" },
  { to: "/pre-cadastro", label: "Como se Inscrever" },
];

export function PublicLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="Hidro e Natação Monsenhor"
              className="h-12 w-auto max-w-[88px] shrink-0 object-contain sm:h-22 sm:max-w-[108px]"
            />
            <span className="flex flex-col leading-tight">
              <span
                className="font-display text-base font-bold sm:text-lg"
                style={{ color: "#0B1F3A" }}
              >
                Hidro e Natação Monsenhor
              </span>
              <span className="hidden text-[11px] text-muted-foreground sm:block">
                Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
                activeProps={{
                  className: "rounded-md px-3 py-2 text-sm font-semibold text-primary bg-accent",
                }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/acesso"
              className="ml-2 rounded-full bg-primary/80 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary"
            >
              Minha Conta
            </Link>
          </nav>

          <button
            type="button"
            aria-label="Abrir menu"
            className="rounded-md p-2 text-foreground hover:bg-accent md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border bg-background md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  {n.label}
                </Link>
              ))}
              <Link
                to="/acesso"
                onClick={() => setOpen(false)}
                className="mt-1 self-start rounded-full bg-primary/80 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary"
              >
                Minha Conta
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-secondary/60">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-8 px-4 py-10 text-sm text-muted-foreground md:grid-cols-[1.45fr_1fr_1fr]">
          <div className="leading-relaxed">
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt=""
                className="h-17 w-auto max-w-[96px] shrink-0 object-contain"
                aria-hidden
              />
              <p className="font-display font-semibold text-foreground">
                Hidro e Natação Monsenhor
              </p>
            </div>
            <p className="mt-3 max-w-[340px] text-xs">
              Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira
            </p>
          </div>

          <div className="leading-relaxed md:mx-auto md:w-fit">
            <p className="font-semibold text-foreground">Localização</p>
            <p className="mt-3">Rua Doutor Barros Franco, S/N</p>
            <p>Pedro do Rio – Petrópolis, RJ</p>
            <p>CEP 25750-290</p>
          </div>

          <div className="leading-relaxed md:ml-auto md:w-fit">
            <p className="font-semibold text-foreground">Atendimento</p>
            <div className="mt-3 space-y-1">
              <p>Segundas e quintas: 8h às 16h</p>
              <p>Terças e quartas: 13h às 21h</p>
              <p>Sextas: 7h às 15h</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Hidro e Natação Monsenhor — Centro Esportivo e Cultural
          Professora Marta Regina de Carvalho Ferreira
        </div>
      </footer>
    </div>
  );
}
