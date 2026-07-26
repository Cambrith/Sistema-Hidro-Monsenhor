import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Button } from "@/componentes/ui/button";
import { useState } from "react";
import { entrar, sincronizarSessao } from "@/utilitarios/autenticacao";
import { statusBloqueio, registrarTentativaFalha, limparTentativas } from "@/utilitarios/limite-requisicoes";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/imagens/logo.png";
// Proteção contra tentativas de força bruta no login.
const MAX_TENTATIVAS_ADMIN = 5;
const BLOQUEIO_ADMIN_MS = 15 * 60 * 1000; // 15 minutos

export const Route = createFileRoute("/painel/login")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    if (await sincronizarSessao()) {
      throw redirect({ to: "/painel" });
    }
  },
  head: () => ({
    meta: [
      { title: "Entrar no painel administrativo" },
      {
        name: "description",
        content:
          "Acesso ao painel administrativo do Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira.",
      },
      // apple-mobile-web-app-title e os links de manifest/apple-touch-icon já
      // vêm de painel.tsx (rota pai) — duplicar aqui faria o <head> ganhar
      // <link rel="manifest"> repetido (links não são deduplicados entre
      // rotas, diferente de meta/title).
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [entrando, setEntrando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bloqueio = statusBloqueio("admin");

    if (bloqueio.bloqueado) {
      const minutos = Math.ceil(bloqueio.segundosRestantes / 60);
      toast.error(
        `Muitas tentativas erradas. Tente novamente em ${minutos} minuto${minutos > 1 ? "s" : ""}.`,
      );
      return;
    }

    if (!usuario.trim() || !senha.trim()) {
      toast.error("Informe usuário e senha.");
      return;
    }

    try {
      setEntrando(true);

      const sessao = await entrar(usuario, senha);

      if (!sessao) {
        const resultado = registrarTentativaFalha("admin", MAX_TENTATIVAS_ADMIN, BLOQUEIO_ADMIN_MS);

        if (resultado.bloqueado) {
          const minutos = Math.ceil(resultado.segundosRestantes / 60);
          toast.error(`Muitas tentativas erradas. Acesso bloqueado por ${minutos} minutos.`);
        } else {
          toast.error(
            `Usuário ou senha inválidos. Tentativas restantes: ${resultado.tentativasRestantes}.`,
          );
        }

        return;
      }

      limparTentativas("admin");
      toast.success(`Bem-vindo(a), ${sessao.perfil}.`);

      nav({ to: "/painel" });
    } catch (error) {
      console.error(error);

      toast.error("Não foi possível entrar no painel.");
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="grid h-screen overflow-hidden lg:grid-cols-[0.86fr_1.14fr]">
      <div
        className="relative hidden h-screen overflow-hidden text-primary-foreground lg:block"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative flex h-full flex-col justify-between p-9 xl:p-10">
          <div className="flex items-center gap-5">
            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-white/95 shadow-sm">
              <img
                src={logo}
                alt="Hidro e Natação Monsenhor"
                className="h-full w-full object-contain"
              />
            </span>

            <div className="min-w-0 leading-tight">
              <p className="font-display text-2xl font-semibold">Hidro e Natação Monsenhor</p>

              <p className="mt-1 max-w-107.5 text-sm leading-snug text-white/80">
                Centro Esportivo e Cultural Professora Marta Regina de Carvalho Ferreira
              </p>
            </div>
          </div>

          <div className="max-w-xl space-y-4 pt-6">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/65">
              Painel administrativo
            </p>

            <h2 className="font-display text-4xl font-semibold leading-tight">
              Gestão completa do centro, em um só lugar.
            </h2>

            <p className="max-w-md text-sm leading-relaxed text-white/85">
              Área de trabalho para alunos, turmas, presença, documentos, lista de espera, avisos e
              relatórios do centro.
            </p>
          </div>

          <p className="text-xs text-white/70">
            © {new Date().getFullYear()} Hidro e Natação Monsenhor — Painel administrativo interno.
          </p>
        </div>
      </div>

      <div className="flex h-screen items-center justify-center overflow-y-auto bg-background px-6 py-10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Entrar no painel</CardTitle>

            <CardDescription>
              Use as credenciais fornecidas pela equipe responsável.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Usuário</Label>

                <Input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  autoComplete="username"
                  disabled={entrando}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Senha</Label>

                <div className="relative">
                  <Input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="current-password"
                    disabled={entrando}
                    className="pr-11"
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarSenha((valor) => !valor)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {mostrarSenha ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={entrando}>
                {entrando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              Acesso reservado à equipe autorizada.
            </p>

            <div className="mt-6 text-center text-sm">
              <Link
                to="/acesso"
                className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
