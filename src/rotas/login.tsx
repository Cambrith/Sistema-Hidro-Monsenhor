import { createFileRoute, redirect } from "@tanstack/react-router";

// Ponte pro endereço antigo (pré-Fase 10, quando o login vivia solto em
// /login). Mantida pra não quebrar favoritos salvos pela equipe.
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/painel/login" });
  },
});
