// Fuso fixo do Centro: America/Sao_Paulo é sempre UTC-3, sem horário de
// verão desde 2019 — por isso um offset fixo é seguro aqui, sem precisar
// de tabela de fuso horário nem de dependência nova.
//
// Importante: as rotas do painel/portal rodam com SSR (servidor, tipicamente
// UTC) e depois hidratam no navegador (Brasília) — "hora local" do runtime
// não é confiável nesse cenário, porque significa coisas diferentes em cada
// ambiente. Por isso os helpers abaixo sempre leem os getters UTC() de um
// instante já deslocado, nunca os getters locais do Date (que dependem do
// fuso do processo Node no servidor ou do sistema operacional no cliente).
const OFFSET_BRASILIA_MS = 3 * 60 * 60 * 1000;

function partesDataBrasilia(deslocamentoAnos = 0) {
  const deslocado = new Date(Date.now() - OFFSET_BRASILIA_MS);
  const ano = deslocado.getUTCFullYear() + deslocamentoAnos;
  const mes = String(deslocado.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(deslocado.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Data de hoje em Brasília, como "YYYY-MM-DD". Nunca usar toISOString() pra isso. */
export function hojeBrasilia(): string {
  return partesDataBrasilia();
}

/** Data de hoje em Brasília, deslocada N anos (positivo = futuro). */
export function dataBrasiliaMaisAnos(anos: number): string {
  return partesDataBrasilia(anos);
}

/**
 * Idade em anos completos a partir da data de nascimento. Consolidada aqui
 * porque existia duplicada em painel.alunos.tsx e painel.pre-cadastros.tsx —
 * é exatamente esse tipo de duplicação que deixa uma correção de bug
 * incompleta (corrige numa cópia, esquece a outra).
 *
 * Sempre calcule a idade a partir de `nascimento` no momento do uso — nunca
 * confie num valor de `idade` armazenado em `alunos`/`lista_espera` (esses
 * campos existem só por compatibilidade com dado legado e desatualizam
 * sozinhos a cada aniversário; ver memória do projeto sobre isso).
 */
export function calcIdade(nascimento: string): number {
  if (!nascimento) return 0;
  const dataNascimento = new Date(nascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNascimento.getFullYear();
  const diferencaMes = hoje.getMonth() - dataNascimento.getMonth();
  if (diferencaMes < 0 || (diferencaMes === 0 && hoje.getDate() < dataNascimento.getDate())) {
    idade -= 1;
  }
  return Math.max(0, idade);
}
