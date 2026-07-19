import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Megaphone } from "lucide-react";
import { supabaseAluno } from "@/utilitarios/supabase";
import { Button } from "@/componentes/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/componentes/ui/popover";

type AvisoResumo = {
  id: string;
  titulo: string;
  resumo: string | null;
  data: string;
  importante: boolean;
};

function formatarData(data?: string | null) {
  if (!data) return "—";
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function SinoAvisosPortal({
  alunoId,
  naoLidos,
}: {
  alunoId: string;
  naoLidos: number;
}) {
  const [avisos, setAvisos] = useState<AvisoResumo[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function carregarRecentes() {
    setCarregando(true);
    const { data } = await supabaseAluno.rpc("portal_avisos_listar", { p_aluno_id: alunoId });
    setAvisos(((data ?? []) as AvisoResumo[]).slice(0, 5));
    setCarregando(false);
  }

  return (
    <Popover onOpenChange={(open) => open && !avisos && carregarRecentes()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative ml-auto shrink-0">
          <Bell className="h-5 w-5" />
          {naoLidos > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {naoLidos > 9 ? "9+" : naoLidos}
            </span>
          )}
          <span className="sr-only">Avisos</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Avisos recentes</p>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {carregando && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          )}

          {!carregando && avisos?.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum aviso publicado ainda.
            </p>
          )}

          {!carregando &&
            avisos?.map((aviso) => (
              <div key={aviso.id} className="flex gap-3 border-b border-border/60 px-4 py-3 last:border-0">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{aviso.titulo}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {aviso.resumo || "Toque para ver os detalhes."}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    {formatarData(aviso.data)}
                  </p>
                </div>
              </div>
            ))}
        </div>

        <div className="border-t border-border p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/portal/avisos">Ver todos os avisos</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
