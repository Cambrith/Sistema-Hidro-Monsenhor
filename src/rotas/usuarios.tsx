import { createFileRoute, redirect } from "@tanstack/react-router";

// Ponte pro endereço antigo (pré-Fase 10, quando o admin vivia em rotas
// soltas). Mantida pra não quebrar favoritos salvos pela equipe.
// Aponta direto pro destino atual (pós-Fase 11) pra evitar redirect duplo.
export const Route = createFileRoute("/usuarios")({
  beforeLoad: () => {
    throw redirect({ to: "/painel/seguranca-acessos" });
  },
});
