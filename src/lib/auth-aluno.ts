import { supabase } from "@/lib/supabase";

const KEY = "hidro-monsenhor-aluno-session";
const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

export type SessaoAluno = {
  id: string;
  nome: string;
  cpf: string;
  expiresAt: number;
};

function normalizarNumero(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function getSessaoAluno(): SessaoAluno | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const sessao = JSON.parse(raw) as SessaoAluno;

    if (!sessao?.id || !sessao?.nome || !sessao?.cpf) {
      localStorage.removeItem(KEY);
      return null;
    }

    if (sessao.expiresAt && Date.now() > sessao.expiresAt) {
      localStorage.removeItem(KEY);
      return null;
    }

    return sessao;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}

export async function loginAluno(
  cpf: string,
  nascimento: string,
  telefone: string,
): Promise<SessaoAluno | null> {
  if (typeof window === "undefined") return null;

  const cpfNorm = normalizarNumero(cpf);
  const telefoneNorm = normalizarNumero(telefone);

  if (!cpfNorm || cpfNorm.length < 11 || !nascimento || !telefoneNorm) {
    return null;
  }

  const { data: alunos, error } = await supabase.rpc("verificar_login_aluno", {
    p_cpf: cpfNorm,
    p_nascimento: nascimento,
    p_telefone: telefoneNorm,
  });

  const aluno = alunos?.[0];
  if (error || !aluno) return null;

  const sessao: SessaoAluno = {
    id: aluno.id,
    nome: aluno.nome_completo,
    cpf: cpfNorm,
    expiresAt: Date.now() + TRINTA_DIAS_MS,
  };

  localStorage.setItem(KEY, JSON.stringify(sessao));
  return sessao;
}

export function sairAluno(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function temSessaoAluno(): boolean {
  return getSessaoAluno() !== null;
}