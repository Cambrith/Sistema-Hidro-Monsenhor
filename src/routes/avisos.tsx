import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/public-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Megaphone } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/avisos")({
  head: () => ({
    meta: [
      { title: "Avisos institucionais" },
      {
        name: "description",
        content:
          "Comunicados oficiais do Centro Esportivo Prof.ª Marta Regina.",
      },
    ],
  }),
  component: AvisosPublicos,
});

type Aviso = {
  id: string;
  titulo: string;
  mensagem: string;
  data: string;
  importante: boolean;
  publico: boolean;
  ativo: boolean;
  created_at?: string;
};

function AvisosPublicos() {
  const [publicos, setPublicos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarAvisos() {
      setCarregando(true);
      setErro("");

      const { data, error } = await supabase
        .from("avisos")
        .select("*")
        .eq("ativo", true)
        .eq("publico", true)
        .order("data", { ascending: false });

      if (error) {
        console.error("Erro ao carregar avisos:", error);
        setErro("Não foi possível carregar os avisos no momento.");
        setCarregando(false);
        return;
      }

      setPublicos((data ?? []) as Aviso[]);
      setCarregando(false);
    }

    carregarAvisos();
  }, []);

 return (
  <PublicLayout>
    <section className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">
        Avisos
      </h1>

      <p className="mt-1 text-sm text-muted-foreground">
        Comunicados oficiais da administração do centro.
      </p>

      <div className="mt-6 space-y-4">
        {carregando && (
          <p className="text-sm text-muted-foreground">
            Carregando avisos...
          </p>
        )}

          {!carregando && erro && (
            <p className="text-sm text-destructive">{erro}</p>
          )}

          {!carregando && !erro && publicos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum aviso publicado no momento.
            </p>
          )}

          {!carregando &&
            !erro &&
            publicos.map((aviso) => (
              <Card key={aviso.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-primary" />

                    {aviso.importante && (
                      <Badge variant="destructive">Importante</Badge>
                    )}
                  </div>

                  <CardTitle className="text-lg">{aviso.titulo}</CardTitle>

                  <CardDescription>
                    {new Date(`${aviso.data}T00:00:00`).toLocaleDateString(
                      "pt-BR",
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="whitespace-pre-line text-sm text-foreground/80">
  {aviso.mensagem}
</CardContent>
              </Card>
            ))}
        </div>
      </section>
    </PublicLayout>
  );
}