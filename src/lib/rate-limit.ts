// Bloqueio simples de tentativas de login, guardado no localStorage do
// próprio navegador. Não substitui uma proteção no servidor (alguém com
// conhecimento técnico poderia limpar o localStorage ou chamar a API
// direto), mas já dificulta bastante tentativas repetidas feitas por uma
// pessoa comum tentando adivinhar dados de outra pessoa.

const PREFIXO = "hidro-monsenhor-tentativas";

type EstadoTentativas = {
  falhas: number;
  bloqueadoAte: number | null;
};

function chave(escopo: string) {
  return `${PREFIXO}:${escopo}`;
}

function lerEstado(escopo: string): EstadoTentativas {
  if (typeof window === "undefined") return { falhas: 0, bloqueadoAte: null };

  try {
    const raw = localStorage.getItem(chave(escopo));
    if (!raw) return { falhas: 0, bloqueadoAte: null };
    return JSON.parse(raw) as EstadoTentativas;
  } catch {
    return { falhas: 0, bloqueadoAte: null };
  }
}

function salvarEstado(escopo: string, estado: EstadoTentativas) {
  if (typeof window === "undefined") return;
  localStorage.setItem(chave(escopo), JSON.stringify(estado));
}

export type StatusBloqueio = {
  bloqueado: boolean;
  segundosRestantes: number;
};

// Chama ANTES de tentar logar, pra saber se pode nem tentar.
export function statusBloqueio(escopo: string): StatusBloqueio {
  const estado = lerEstado(escopo);

  if (!estado.bloqueadoAte) return { bloqueado: false, segundosRestantes: 0 };

  const restante = estado.bloqueadoAte - Date.now();

  if (restante <= 0) {
    // O bloqueio já venceu — reseta pra dar um recomeço limpo.
    salvarEstado(escopo, { falhas: 0, bloqueadoAte: null });
    return { bloqueado: false, segundosRestantes: 0 };
  }

  return { bloqueado: true, segundosRestantes: Math.ceil(restante / 1000) };
}

// Chama depois de um login que FALHOU.
export function registrarTentativaFalha(
  escopo: string,
  maxTentativas: number,
  duracaoBloqueioMs: number,
): StatusBloqueio & { tentativasRestantes: number } {
  const estado = lerEstado(escopo);
  const falhas = estado.falhas + 1;

  if (falhas >= maxTentativas) {
    const bloqueadoAte = Date.now() + duracaoBloqueioMs;
    salvarEstado(escopo, { falhas: 0, bloqueadoAte });
    return {
      bloqueado: true,
      segundosRestantes: Math.ceil(duracaoBloqueioMs / 1000),
      tentativasRestantes: 0,
    };
  }

  salvarEstado(escopo, { falhas, bloqueadoAte: null });
  return {
    bloqueado: false,
    segundosRestantes: 0,
    tentativasRestantes: maxTentativas - falhas,
  };
}

// Chama depois de um login que DEU CERTO — limpa o histórico de falhas.
export function limparTentativas(escopo: string) {
  salvarEstado(escopo, { falhas: 0, bloqueadoAte: null });
}