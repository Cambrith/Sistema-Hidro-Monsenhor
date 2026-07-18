import { createFileRoute, redirect } from "@tanstack/react-router";

// Ponte pro endereço antigo (pré-Fase 11, quando "Usuários e Perfis" ainda
// era uma tela própria). Mantida pra não quebrar favoritos salvos pela
// equipe — a tela virou parte de /painel/diagnostico (Bloco 4).
export const Route = createFileRoute("/painel/usuarios")({
  beforeLoad: () => {
    throw redirect({ to: "/painel/diagnostico" });
  },
});
