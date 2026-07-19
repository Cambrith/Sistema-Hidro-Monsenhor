import { Badge } from "@/componentes/ui/badge";
import type { LucideIcon } from "lucide-react";

// Compartilhado entre as 3 páginas de sistema (Banco de Dados, Aplicação e
// Segurança/Acessos) — mesmo cartão de métrica em todas.
export function InfoCard({
  icon: Icon,
  label,
  valor,
  sub,
  tone = "ok",
}: {
  icon: LucideIcon;
  label: string;
  valor: string;
  sub?: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </span>
        {tone === "warn" && (
          <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-800">
            Atenção
          </Badge>
        )}
      </div>
      <p className="mt-3 text-lg font-bold leading-tight">{valor}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
