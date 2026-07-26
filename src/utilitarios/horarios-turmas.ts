export type Modalidade = "Natação Infantil" | "Natação Adulta" | "Hidroginástica";

// Duração padrão de cada aula, em minutos.
// Observação: o quadro físico sugere algumas variações (45min/70min) em
// horários específicos de terças e quintas, ainda não confirmadas oficialmente.
// Usando 50min como padrão por ora — ajustar aqui se a duração real for diferente.
const DURACAO_AULA_MINUTOS = 50;

function horaFimDe(horaInicio: string): string {
  const [h, m] = horaInicio.split(":").map(Number);
  const totalMinutos = h * 60 + m + DURACAO_AULA_MINUTOS;
  const horaFim = Math.floor(totalMinutos / 60) % 24;
  const minutoFim = totalMinutos % 60;
  return `${String(horaFim).padStart(2, "0")}:${String(minutoFim).padStart(2, "0")}`;
}

type ItemHorarioBase = { hora: string; modalidade: Modalidade };

function comHoraFim(lista: ItemHorarioBase[]): (ItemHorarioBase & { horaFim: string })[] {
  return lista.map((item) => ({ ...item, horaFim: horaFimDe(item.hora) }));
}

// Grade real 2026 — Segundas e Quartas
export const horarioSegQua = comHoraFim([
  { hora: "07:10", modalidade: "Hidroginástica" },
  { hora: "08:00", modalidade: "Natação Infantil" },
  { hora: "08:50", modalidade: "Natação Infantil" },
  { hora: "09:40", modalidade: "Natação Infantil" },
  { hora: "10:30", modalidade: "Natação Infantil" },
  { hora: "11:20", modalidade: "Natação Infantil" },
  { hora: "13:00", modalidade: "Natação Infantil" },
  { hora: "13:50", modalidade: "Natação Infantil" },
  { hora: "14:40", modalidade: "Natação Infantil" },
  { hora: "15:30", modalidade: "Natação Infantil" },
  { hora: "16:20", modalidade: "Natação Infantil" },
  { hora: "17:10", modalidade: "Natação Infantil" },
  { hora: "18:00", modalidade: "Natação Adulta" },
  { hora: "18:50", modalidade: "Natação Adulta" },
  { hora: "19:40", modalidade: "Natação Adulta" },
  { hora: "20:20", modalidade: "Natação Adulta" },
]);

// Grade real 2026 — Terças e Quintas
export const horarioTerQui = comHoraFim([
  { hora: "07:10", modalidade: "Hidroginástica" },
  { hora: "08:00", modalidade: "Hidroginástica" },
  { hora: "08:50", modalidade: "Natação Infantil" },
  { hora: "09:40", modalidade: "Natação Adulta" },
  { hora: "10:30", modalidade: "Hidroginástica" },
  { hora: "11:20", modalidade: "Hidroginástica" },
  { hora: "13:00", modalidade: "Hidroginástica" },
  { hora: "13:45", modalidade: "Natação Adulta" },
  { hora: "14:30", modalidade: "Natação Adulta" },
  { hora: "15:15", modalidade: "Natação Infantil" },
  { hora: "16:00", modalidade: "Hidroginástica" },
  { hora: "17:10", modalidade: "Hidroginástica" },
  { hora: "18:00", modalidade: "Hidroginástica" },
  { hora: "18:50", modalidade: "Hidroginástica" },
  { hora: "19:40", modalidade: "Natação Adulta" },
  { hora: "20:20", modalidade: "Hidroginástica" },
]);
