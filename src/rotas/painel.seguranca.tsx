import { createFileRoute, redirect } from "@tanstack/react-router";

// Ponte pro endereço antigo (pré-Fase 11, quando "Segurança e Backup" ainda
// era uma tela própria). Mantida pra não quebrar favoritos salvos pela
// equipe — a tela virou a página "Segurança e Acessos".
export const Route = createFileRoute("/painel/seguranca")({
  beforeLoad: () => {
    throw redirect({ to: "/painel/seguranca-acessos" });
  },
});
