import { createFileRoute, redirect } from "@tanstack/react-router";

// Ponte pro endereço antigo (pré-Fase 11, quando "Usuários e Perfis" ainda
// era uma tela própria). Mantida pra não quebrar favoritos salvos pela
// equipe — a tela virou a seção "Equipe e acessos" de Segurança e Acessos.
export const Route = createFileRoute("/painel/usuarios")({
  beforeLoad: () => {
    throw redirect({ to: "/painel/seguranca-acessos" });
  },
});
