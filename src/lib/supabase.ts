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
  let todos: T[] = [];
  let pagina = 0;

  while (true) {
    const inicio = pagina * TAMANHO_BLOCO;
    const fim = inicio + TAMANHO_BLOCO - 1;

    let query = supabase.from(tabela).select(colunas).range(inicio, fim);
    if (opcoes?.aplicarFiltros) query = opcoes.aplicarFiltros(query);
    if (opcoes?.ordenarPor) {
      query = query.order(opcoes.ordenarPor, { ascending: opcoes.ascendente ?? true });
      if (opcoes.ordenarPor !== "id") {
        query = query.order("id", { ascending: true });
      }
    }

    const { data, error } = await query;
    if (error) return { data: todos, error };
    if (!data || data.length === 0) break;

    todos = todos.concat(data as T[]);
    if (data.length < TAMANHO_BLOCO) break;
    pagina++;
  }

  return { data: todos, error: null };
}
