import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/componentes/layout-publico";
import { Waves, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/acesso")({
  head: () => ({
    meta: [{ title: "Acesso — Hidro e Natação Monsenhor" }],
  }),
  component: Acesso,
});

function Acesso() {
  return (
    <PublicLayout>
      <div
        className="relative flex min-h-[calc(100vh-64px)] flex-col items-center justify-center overflow-hidden px-4 py-20"
        style={{ background: "linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 h-100 w-100 -translate-x-1/2 rounded-full opacity-50"
          style={{ background: "radial-gradient(closest-side, #DBEAFE, transparent)" }}
        />

        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
          <div className="mb-10 text-center">
            <h1
              className="font-display text-3xl font-bold sm:text-4xl"
              style={{ color: "#0B1F3A" }}
            >
              Como você quer acessar?
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Escolha o tipo de acesso adequado ao seu perfil.
            </p>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2">
            {/* Card Aluno */}
            <Link to="/portal" className="group">
              <div className="relative flex h-full flex-col rounded-2xl border border-[#DBEAFE] bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#1D4ED8]/50 hover:shadow-lg">
                <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-[#1D4ED8]" />
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EFF6FF] text-[#1D4ED8] shadow-sm">
                  <Waves className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-xl font-semibold" style={{ color: "#0B1F3A" }}>
                  Sou aluno
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  Veja suas presenças, faltas, turma, documentos e avisos da secretaria. Acesse com
                  nome completo e data de nascimento.
                </p>
                <span className="mt-6 inline-flex items-center text-sm font-semibold text-[#1D4ED8]">
                  Acessar minha conta
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>

            {/* Card Equipe */}
            <Link to="/painel/login" className="group">
              <div className="relative flex h-full flex-col rounded-2xl border border-border bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-400/50 hover:shadow-lg">
                <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-slate-400" />
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-600 shadow-sm">
                  <Users className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-xl font-semibold" style={{ color: "#0B1F3A" }}>
                  Sou da equipe
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  Gerencie alunos, turmas, presença, documentos e avisos do centro. Acesso restrito
                  para recepção, professores e administração, com usuário e senha.
                </p>
                <span className="mt-6 inline-flex items-center text-sm font-semibold text-slate-600">
                  Acessar o painel
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Dificuldades para acessar?{" "}
            <a href="/#canais-oficiais" className="font-medium text-foreground/70 hover:underline">
              Veja os canais de contato
            </a>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
