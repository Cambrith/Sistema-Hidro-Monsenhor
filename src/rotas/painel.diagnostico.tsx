import { createFileRoute, redirect } from "@tanstack/react-router";

// Ponte pro endereço antigo. "Diagnóstico do Sistema" era uma única tela com
// 3 abas — virou 3 páginas separadas no menu (Banco de Dados, Aplicação/
// Deploy, Segurança e Acessos), cada uma com seu próprio ícone na sidebar.
// Mantida pra não quebrar favoritos salvos pela equipe.
export const Route = createFileRoute("/painel/diagnostico")({
  beforeLoad: () => {
    throw redirect({ to: "/painel/banco-dados" });
  },
});
