// Calcula a situação de validade de um documento (atestado ou PAR-Q) a partir
// da data salva no cadastro do aluno. Fonte única — antes essa mesma função
// vivia duplicada em portal.tsx e portal.inicio.tsx.
export type StatusValidade = "ok" | "vencendo" | "vencido" | "ausente";

// Data de corte usada na migração de dados dos alunos importados do sistema
// antigo (sem data real de última aprovação de atestado/PAR-Q): até essa
// data, `atestado_validade`/`parq_validade` desses alunos foram preenchidos
// com esse valor pra não disparar falso alarme de "vencido"/"ausente". A
// partir dela, esses alunos entram no ciclo normal de renovação anual, igual
// todo mundo — nenhuma lógica nova de renovação depende desta constante, ela
// só documenta a data usada na migração pontual (ver histórico de migrações
// do banco). Referência: 1º dia letivo de 2027, combinado com a secretaria.
export const DATA_CORTE_MIGRACAO_DOCUMENTOS = "2027-02-01";

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
