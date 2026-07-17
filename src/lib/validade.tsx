// Calcula a situação de validade de um documento (atestado ou PAR-Q) a partir
// da data salva no cadastro do aluno. Fonte única — antes essa mesma função
// vivia duplicada em portal.tsx e portal.inicio.tsx.
export type StatusValidade = "ok" | "vencendo" | "vencido" | "ausente";

export function statusValidade(validade?: string | null): StatusValidade {
  if (!validade) return "ausente";
  // Datas tipo "YYYY-MM-DD" viram meia-noite UTC se passadas direto pro
  // Date() — em horário do Brasil isso adianta o vencimento quase um dia
  // inteiro. Forçando meia-noite local o diff bate com o calendário real.
  const diff =
    (new Date(`${validade}T00:00:00`).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "vencido";
  if (diff <= 30) return "vencendo";
  return "ok";
}
