import { useEffect, useState } from "react";

export type Modalidade = "Natação Infantil" | "Natação Adulta" | "Hidroginástica";
export type Turno = "Manhã" | "Tarde" | "Noite";
export type StatusPreCadastro =
  | "pendente"
  | "aprovado"
  | "fila de espera"
  | "recusado"
  | "inativo";
export type StatusAluno = "ativo" | "inativo" | "fila de espera";
export type StatusTurma = "ativa" | "encerrada" | "em formação";
export type StatusPresenca = "presente" | "falta" | "falta justificada";

export type PreCadastro = {
  id: string;
  nomeAluno: string;
  nascimento: string;
  idade: number;
  modalidade: Modalidade;
  turno: Turno;
  escolaTurma?: string;
  observacoes?: string;
  responsavel: string;
  telefone: string;
  whatsapp: string;
  email?: string;
  status: StatusPreCadastro;
  criadoEm: string;
};

export type Aluno = {
  id: string;
  nome: string;
  nascimento: string;
  idade: number;
  modalidade: Modalidade;
  turmaId?: string;
  responsavel: string;
  telefone: string;
  status: StatusAluno;
};

export type Turma = {
  id: string;
  nome: string;
  modalidade: Modalidade;
  diasHorario: string;
  professor: string;
  faixaEtaria: string;
  vagas: number;
  inscritos: number;
  status: StatusTurma;
};

export type Aviso = {
  id: string;
  titulo: string;
  mensagem: string;
  data: string;
  importante: boolean;
  publico: boolean;
};

export type Presenca = {
  id: string;
  turmaId: string;
  data: string;
  registros: { alunoId: string; status: StatusPresenca }[];
};

type DB = {
  preCadastros: PreCadastro[];
  alunos: Aluno[];
  turmas: Turma[];
  avisos: Aviso[];
  presencas: Presenca[];
};

const KEY = "hidro-monsenhor-db-v5";

const uid = () => Math.random().toString(36).slice(2, 10);

// Grade real 2026 — Segundas e Quartas
export const horarioSegQua: { hora: string; modalidade: Modalidade }[] = [
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
];

// Grade real 2026 — Terças e Quintas
export const horarioTerQui: { hora: string; modalidade: Modalidade }[] = [
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
];

const turnoDe = (hora: string): Turno => {
  const h = parseInt(hora.slice(0, 2), 10);

  if (h < 12) return "Manhã";
  if (h < 18) return "Tarde";
  return "Noite";
};

const professorDe = (): string => {
  return "Equipe de Educação Física";
};

const faixaDe = (modalidade: Modalidade): string => {
  if (modalidade === "Natação Infantil") return "8 a 17 anos";
  return "18 anos ou mais";
};

const vagasDe = (modalidade: Modalidade): number => {
  if (modalidade === "Natação Infantil") return 12;
  return 16;
};

const gerarNomeTurma = (
  modalidade: Modalidade,
  hora: string,
  contadores: Record<string, number>
): string => {
  const turno = turnoDe(hora);
  const chave = `${modalidade}-${turno}`;

  contadores[chave] = (contadores[chave] ?? 0) + 1;

  return `${modalidade} — ${turno} ${contadores[chave]}`;
};

const criarTurmas = (): Turma[] => {
  let idCounter = 0;
  const next = () => `t${++idCounter}`;
  const contadores: Record<string, number> = {};

  const turmasSegQua: Turma[] = horarioSegQua.map((s) => ({
    id: next(),
    nome: gerarNomeTurma(s.modalidade, s.hora, contadores),
    modalidade: s.modalidade,
    diasHorario: `Segunda e quarta, ${s.hora}`,
    professor: professorDe(),
    faixaEtaria: faixaDe(s.modalidade),
    vagas: vagasDe(s.modalidade),
    inscritos: 0,
    status: "ativa",
  }));

  const turmasTerQui: Turma[] = horarioTerQui.map((s) => ({
    id: next(),
    nome: gerarNomeTurma(s.modalidade, s.hora, contadores),
    modalidade: s.modalidade,
    diasHorario: `Terça e quinta, ${s.hora}`,
    professor: professorDe(),
    faixaEtaria: faixaDe(s.modalidade),
    vagas: vagasDe(s.modalidade),
    inscritos: 0,
    status: "ativa",
  }));

  return [...turmasSegQua, ...turmasTerQui];
};

const seed = (): DB => {
  const turmas = criarTurmas();

  return {
    preCadastros: [],
    alunos: [],
    turmas,
    avisos: [],
    presencas: [],
  };
};

type Listener = () => void;

const listeners = new Set<Listener>();
let cache: DB | null = null;

function load(): DB {
  if (cache) return cache;

  if (typeof window === "undefined") {
    cache = seed();
    return cache;
  }

  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      cache = JSON.parse(raw) as DB;
      return cache;
    }
  } catch {}

  cache = seed();
  localStorage.setItem(KEY, JSON.stringify(cache));

  return cache;
}

function persist() {
  if (typeof window !== "undefined" && cache) {
    localStorage.setItem(KEY, JSON.stringify(cache));
  }

  listeners.forEach((l) => l());
}

export function useDB() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const l = () => setTick((n) => n + 1);

    listeners.add(l);

    return () => {
      listeners.delete(l);
    };
  }, []);

  return load();
}

export const db = {
  get: () => load(),

  addPreCadastro(p: Omit<PreCadastro, "id" | "status" | "criadoEm">) {
    const d = load();

    d.preCadastros.unshift({
      ...p,
      id: uid(),
      status: "pendente",
      criadoEm: new Date().toISOString().slice(0, 10),
    });

    persist();
  },

  updatePreCadastroStatus(id: string, status: StatusPreCadastro) {
    const d = load();
    const p = d.preCadastros.find((x) => x.id === id);

    if (p) p.status = status;

    persist();
  },

  converterPreCadastro(id: string) {
    const d = load();
    const p = d.preCadastros.find((x) => x.id === id);

    if (!p) return;

    d.alunos.unshift({
      id: uid(),
      nome: p.nomeAluno,
      nascimento: p.nascimento,
      idade: p.idade,
      modalidade: p.modalidade,
      responsavel: p.responsavel,
      telefone: p.telefone,
      status: "ativo",
    });

    p.status = "aprovado";

    persist();
  },

  addAluno(a: Omit<Aluno, "id">) {
    load().alunos.unshift({
      ...a,
      id: uid(),
    });

    persist();
  },

  updateAluno(id: string, patch: Partial<Aluno>) {
    const a = load().alunos.find((x) => x.id === id);

    if (a) Object.assign(a, patch);

    persist();
  },

  addTurma(t: Omit<Turma, "id">) {
    load().turmas.unshift({
      ...t,
      id: uid(),
    });

    persist();
  },

  updateTurma(id: string, patch: Partial<Turma>) {
    const t = load().turmas.find((x) => x.id === id);

    if (t) Object.assign(t, patch);

    persist();
  },

  addAviso(a: Omit<Aviso, "id">) {
    load().avisos.unshift({
      ...a,
      id: uid(),
    });

    persist();
  },

  updateAviso(id: string, patch: Partial<Aviso>) {
    const a = load().avisos.find((x) => x.id === id);

    if (a) Object.assign(a, patch);

    persist();
  },

  removeAviso(id: string) {
    const d = load();

    d.avisos = d.avisos.filter((a) => a.id !== id);

    persist();
  },

  salvarPresenca(
    turmaId: string,
    data: string,
    registros: { alunoId: string; status: StatusPresenca }[]
  ) {
    const d = load();

    const existing = d.presencas.find(
      (p) => p.turmaId === turmaId && p.data === data
    );

    if (existing) {
      existing.registros = registros;
    } else {
      d.presencas.unshift({
        id: uid(),
        turmaId,
        data,
        registros,
      });
    }

    persist();
  },
};