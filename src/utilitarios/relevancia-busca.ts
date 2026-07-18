export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// Damerau-Levenshtein (variante OSA) com corte antecipado: retorna `limite + 1`
// assim que a linha inteira do DP já ultrapassa o limite, evitando terminar a
// matriz em comparações claramente fora de tolerância.
function distanciaEdicaoLimitada(a: string, b: string, limite: number): number {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > limite) return limite + 1;
  if (la === 0 || lb === 0) return Math.max(la, lb);

  const d: number[][] = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) d[i][0] = i;
  for (let j = 0; j <= lb; j++) d[0][j] = j;

  for (let i = 1; i <= la; i++) {
    let melhorLinha = Infinity;
    for (let j = 1; j <= lb; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let valor = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        valor = Math.min(valor, d[i - 2][j - 2] + 1);
      }
      d[i][j] = valor;
      if (valor < melhorLinha) melhorLinha = valor;
    }
    if (melhorLinha > limite) return limite + 1;
  }
  return d[la][lb];
}

// Pontua a correspondência de um campo de texto contra o termo buscado, do mais
// forte (igualdade exata) ao mais fraco (fuzzy, tolerante a erro de digitação).
// `pesoBase` define o peso do campo quando combinado com outros campos do
// mesmo registro (ex.: nome > turma > email). Retorna 0 quando não há
// correspondência alguma.
export function pontuarTexto(campo: string, busca: string, pesoBase: number): number {
  if (!busca) return 0;
  const campoNorm = normalizarTexto(campo);
  const buscaNorm = normalizarTexto(busca);
  if (!campoNorm || !buscaNorm) return 0;

  if (campoNorm === buscaNorm) return pesoBase;
  if (campoNorm.startsWith(buscaNorm)) return pesoBase * 0.9;

  const palavrasCampo = campoNorm.split(/\s+/).filter(Boolean);
  if (palavrasCampo.some((palavra) => palavra.startsWith(buscaNorm))) return pesoBase * 0.8;

  const campoSemEspaco = campoNorm.replace(/\s+/g, "");
  const buscaSemEspaco = buscaNorm.replace(/\s+/g, "");
  const palavrasBusca = buscaNorm.split(/\s+/).filter(Boolean);
  const contemSubstring = campoSemEspaco.includes(buscaSemEspaco);
  const contemTodasPalavras =
    palavrasBusca.length > 0 && palavrasBusca.every((palavra) => campoNorm.includes(palavra));
  if (contemSubstring || contemTodasPalavras) return pesoBase * 0.7;

  if (buscaNorm.length >= 3) {
    const limite = buscaNorm.length <= 5 ? 1 : 2;
    const candidatos = [campoNorm, ...palavrasCampo];
    let melhorDistancia = limite + 1;
    for (const candidato of candidatos) {
      if (Math.abs(candidato.length - buscaNorm.length) > limite) continue;
      const distancia = distanciaEdicaoLimitada(candidato, buscaNorm, limite);
      if (distancia < melhorDistancia) melhorDistancia = distancia;
      if (melhorDistancia === 0) break;
    }
    if (melhorDistancia <= limite) {
      return pesoBase * 0.55 * (1 - melhorDistancia / (limite + 1));
    }
  }

  return 0;
}
