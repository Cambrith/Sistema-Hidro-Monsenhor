import { createFileRoute, redirect } from "@tanstack/react-router";

// Ponte pro endereço antigo (pré-Fase 10, quando o admin vivia em rotas
// soltas). Mantida pra não quebrar favoritos salvos pela equipe.
export const Route = createFileRoute("/relatorios")({
  beforeLoad: () => {
    throw redirect({ to: "/painel/relatorios" });
  },
});
