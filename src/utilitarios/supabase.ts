import { createClient, type PostgrestError } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAluno = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "sb-aluno-auth-token",
  },
});
export async function buscarTodasLinhas<T = unknown>(
  tabela: string,
  colunas: string,
  opcoes?: {
    ordenarPor?: string;
    ascendente?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    aplicarFiltros?: (query: any) => any;
  },
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const TAMANHO_BLOCO = 1000;

  function montarQuery(inicio: number, fim: number, comContagem: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = supabase
      .from(tabela)
      .select(colunas, comContagem ? { count: "exact" } : undefined)
      .range(inicio, fim);
    if (opcoes?.aplicarFiltros) query = opcoes.aplicarFiltros(query);
    if (opcoes?.ordenarPor) {
      query = query.order(opcoes.ordenarPor, { ascending: opcoes.ascendente ?? true });
      if (opcoes.ordenarPor !== "id") {
        query = query.order("id", { ascending: true });
      }
    }
    return query;
  }

  const primeira = await montarQuery(0, TAMANHO_BLOCO - 1, true);
  if (primeira.error) return { data: [], error: primeira.error };

  const primeiraPagina = (primeira.data ?? []) as T[];
  const total = primeira.count ?? primeiraPagina.length;

  // Tabela pequena (caso comum): já veio tudo numa única ida, sem custo extra.
  if (primeiraPagina.length < TAMANHO_BLOCO || total <= TAMANHO_BLOCO) {
    return { data: primeiraPagina, error: null };
  }

  // Tabela grande: já sabemos o total pela primeira página, então buscamos o
  // restante em paralelo em vez de uma ida sequencial por bloco — corta a
  // latência de N round-trips pra ~1, importante em conexão/hardware fracos.
  const totalPaginas = Math.ceil(total / TAMANHO_BLOCO);
  const demaisPaginas = await Promise.all(
    Array.from({ length: totalPaginas - 1 }, (_, i) => {
      const pagina = i + 1;
      const inicio = pagina * TAMANHO_BLOCO;
      const fim = inicio + TAMANHO_BLOCO - 1;
      return montarQuery(inicio, fim, false);
    }),
  );

  const erro = demaisPaginas.find((r) => r.error)?.error ?? null;
  if (erro) return { data: primeiraPagina, error: erro };

  const todos = primeiraPagina.concat(...demaisPaginas.map((r) => (r.data ?? []) as T[]));
  return { data: todos, error: null };
}
